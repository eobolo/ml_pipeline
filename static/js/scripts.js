// Species mapping for colors and markers (matching the notebook's palette and markers)
const speciesMap = {
    'setosa': { color: '#E41A1C', marker: 'circle' },      // Red, circle (o)
    'versicolor': { color: '#377EB8', marker: 'square' },   // Blue, square (s)
    'virginica': { color: '#4DAF4A', marker: 'diamond' }    // Green, diamond (D)
};

// Enhanced plot descriptions for storytelling, aligned with the notebook
const plotDescriptions = {
    scatter: (xLabel, yLabel) => `This scatter plot compares ${xLabel} and ${yLabel}. Setosa (red circles) clusters separately, especially in petal dimensions, while Versicolor (blue squares) and Virginica (green diamonds) overlap, particularly in sepal measurements, showing petal features are more discriminative.`,
    boxplot: (features) => `This box plot shows the distribution of ${features.join(', ')} across Iris species. Setosa often has smaller values, while Versicolor and Virginica overlap more, especially in sepal features, indicating petal measurements are better for distinguishing species.`,
    pairplot: `This pairplot shows relationships between all Iris features. Diagonal histograms display each feature's distribution for Setosa (red), Versicolor (blue), and Virginica (green). Off-diagonal scatter plots compare feature pairs, with Setosa distinctly clustered and Versicolor and Virginica overlapping, especially in sepal features.`
};

// Snackbar Function
function showSnackbar(message, type) {
    const snackbar = document.getElementById("snackbar");
    snackbar.innerText = message;
    snackbar.className = type; // 'success' or 'error'
    snackbar.classList.add("show");
    setTimeout(() => {
        snackbar.classList.remove("show");
    }, 3000); // Hide after 3 seconds
}

// Predict
document.getElementById('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="number"]');
    if (Array.from(inputs).some(input => !input.value)) {
        showSnackbar("Error: Please fill in all four feature values.", 'error');
        return;
    }
    const features = Array.from(inputs).map(input => parseFloat(input.value));
    const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
    });
    const resultDiv = document.getElementById('prediction-result');
    if (!response.ok) {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Prediction failed. Please check your inputs and try again.';
        return;
    }
    const data = await response.json();
    showSnackbar(`Prediction successful: ${data.prediction}`, 'success');
    resultDiv.innerText = `Predicted: ${data.prediction} (Probabilities: ${data.probabilities.map(p => p.toFixed(3)).join(', ')})`;
});

// Load Default Visualizations
async function loadDefaultVisualizations() {
    const plots = [
        { id: 'scatter-plot', type: 'scatter', features: 'petal length (cm),petal width (cm)', descId: 'scatter-description', title: 'Petal Length vs Petal Width' },
        { id: 'box-plot', type: 'boxplot', features: 'petal length (cm)', descId: 'box-description', title: 'Petal Length Distribution by Species' },
        { id: 'pair-plot', type: 'pairplot', features: '', descId: 'pair-description', title: 'Pairplot of Iris Features by Species' }
    ];
    for (const plot of plots) {
        const response = await fetch(`/api/visualization?plot_type=${plot.type}&features=${plot.features}`);
        const descDiv = document.getElementById(plot.descId);
        const titleDiv = document.getElementById(`${plot.id}-title`);
        titleDiv.innerText = plot.title;

        if (!response.ok) {
            const errorData = await response.json();
            showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
            descDiv.innerText = `Error: Failed to load visualization.`;
            continue;
        }

        const data = await response.json();
        const isPairplot = plot.type === 'pairplot';
        const layout = {
            autosize: true,
            height: isPairplot ? 1200 : 600,
            margin: { t: 150, b: 50, l: 200, r: 50 },
            legend: {
                x: 1,
                y: 1,
                xanchor: 'right',
                yanchor: 'top'
            },
            annotations: []
        };

        if (plot.type === 'scatter') {
            const trace = { x: data.x, y: data.y, mode: 'markers', type: 'scatter', marker: { size: 8 } };
            const traces = Object.keys(speciesMap).map(species => ({
                ...trace,
                x: data.x.filter((_, i) => data.color[i] === species),
                y: data.y.filter((_, i) => data.color[i] === species),
                name: species,
                marker: { ...trace.marker, color: speciesMap[species].color, symbol: speciesMap[species].marker }
            }));
            Plotly.newPlot(plot.id, traces, layout);
            descDiv.innerText = plotDescriptions.scatter(data.x_label, data.y_label);
        } else if (plot.type === 'boxplot') {
            const traces = [];
            for (const feature of data.features) {
                for (const [species, values] of Object.entries(data.data[feature])) {
                    traces.push({
                        y: values,
                        type: 'box',
                        name: `${species} - ${feature}`,
                        marker: { color: speciesMap[species].color }
                    });
                }
            }
            Plotly.newPlot(plot.id, traces, layout);
            descDiv.innerText = plotDescriptions.boxplot(data.features);
        } else if (plot.type === 'pairplot') {
            const traces = [];
            const n = data.features.length;
            const speciesLegendAdded = {};

            Object.keys(speciesMap).forEach(species => {
                speciesLegendAdded[species] = false;
            });

            const speciesData = {};
            Object.keys(speciesMap).forEach(species => {
                speciesData[species] = data.data.filter(d => d.species === species);
            });

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const xFeature = data.features[j];
                    const yFeature = data.features[i];

                    if (i === j) {
                        Object.keys(speciesMap).forEach(species => {
                            const values = speciesData[species].map(d => d[xFeature]);
                            traces.push({
                                x: values,
                                type: 'histogram',
                                name: species,
                                marker: { color: speciesMap[species].color },
                                xaxis: `x${j + 1}`,
                                yaxis: `y${i + 1}`,
                                opacity: 0.5,
                                showlegend: !speciesLegendAdded[species]
                            });
                            speciesLegendAdded[species] = true;
                        });
                    } else {
                        const scatterTrace = {
                            mode: 'markers',
                            type: 'scattergl',
                            xaxis: `x${j + 1}`,
                            yaxis: `y${i + 1}`,
                            marker: { size: 5 },
                            showlegend: false
                        };
                        Object.keys(speciesMap).forEach(species => {
                            traces.push({
                                ...scatterTrace,
                                x: speciesData[species].map(d => d[xFeature]),
                                y: speciesData[species].map(d => d[yFeature]),
                                name: species,
                                marker: {
                                    ...scatterTrace.marker,
                                    color: speciesMap[species].color,
                                    symbol: speciesMap[species].marker
                                }
                            });
                        });
                    }
                }
            }

            layout.grid = { rows: n, columns: n, pattern: 'independent' };

            if (n === 4) {
                layout.xaxis = { domain: [0, 0.24], title: '' };
                layout.xaxis2 = { domain: [0.26, 0.50], title: '' };
                layout.xaxis3 = { domain: [0.52, 0.76], title: '' };
                layout.xaxis4 = { domain: [0.78, 1], title: '' };
                layout.yaxis = { domain: [0.78, 1], title: '' };
                layout.yaxis2 = { domain: [0.52, 0.76], title: '' };
                layout.yaxis3 = { domain: [0.26, 0.50], title: '' };
                layout.yaxis4 = { domain: [0, 0.24], title: '' };

                data.features.forEach((feature, idx) => {
                    layout.annotations.push({
                        text: feature,
                        x: (idx * 0.26 + 0.13),
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        showarrow: false,
                        font: { size: 12 }
                    });
                });

                data.features.forEach((feature, idx) => {
                    layout.annotations.push({
                        text: feature,
                        x: -0.15,
                        y: (1 - idx * 0.26 - 0.13),
                        xref: 'paper',
                        yref: 'paper',
                        showarrow: false,
                        font: { size: 12 },
                        textangle: -90
                    });
                });
            } else if (n === 2) {
                layout.xaxis = { domain: [0, 0.48], title: '' };
                layout.xaxis2 = { domain: [0.52, 1], title: '' };
                layout.yaxis = { domain: [0.52, 1], title: '' };
                layout.yaxis2 = { domain: [0, 0.48], title: '' };

                data.features.forEach((feature, idx) => {
                    layout.annotations.push({
                        text: feature,
                        x: (idx * 0.52 + 0.26),
                        y: 1.05,
                        xref: 'paper',
                        yref: 'paper',
                        showarrow: false,
                        font: { size: 12 }
                    });
                });

                data.features.forEach((feature, idx) => {
                    layout.annotations.push({
                        text: feature,
                        x: -0.15,
                        y: (1 - idx * 0.52 - 0.26),
                        xref: 'paper',
                        yref: 'paper',
                        showarrow: false,
                        font: { size: 12 },
                        textangle: -90
                    });
                });
            }

            Plotly.newPlot(plot.id, traces, layout);
            descDiv.innerText = plotDescriptions.pairplot;
        }
    }
}
loadDefaultVisualizations();

// Custom Visualization Form
document.getElementById('visualization-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const plotType = form.plot_type.value;
    const featuresInput = form.features.value.trim();
    const features = featuresInput ? featuresInput.split(',').map(f => f.trim()) : [];

    // Client-side validation with snackbars
    if (plotType === 'scatter' && features.length !== 2) {
        showSnackbar("Error: Please provide exactly two features for the scatter plot, separated by commas.", 'error');
        return;
    } else if (plotType === 'boxplot' && features.length === 0) {
        showSnackbar("Error: Please provide at least one feature for the boxplot.", 'error');
        return;
    }

    const response = await fetch(`/api/visualization?plot_type=${plotType}&features=${featuresInput}`);
    if (!response.ok) {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        return;
    }

    const data = await response.json();

    const customPlotsContainer = document.getElementById('custom-plots');
    const plotId = `custom-plot-${Date.now()}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'plot-wrapper';
    if (plotType === 'pairplot') wrapper.classList.add('pairplot');
    wrapper.innerHTML = `
        <div class="plot" id="${plotId}"></div>
        <div class="plot-title"></div>
        <div class="plot-description"></div>
    `;
    customPlotsContainer.appendChild(wrapper);

    const isPairplot = plotType === 'pairplot';
    const layout = {
        autosize: true,
        height: isPairplot ? 1200 : 600,
        margin: { t: 150, b: 50, l: 200, r: 50 },
        legend: {
            x: 1,
            y: 1,
            xanchor: 'right',
            yanchor: 'top'
        },
        annotations: []
    };
    const titleDiv = wrapper.querySelector('.plot-title');
    const descDiv = wrapper.querySelector('.plot-description');

    if (plotType === 'scatter') {
        const trace = { x: data.x, y: data.y, mode: 'markers', type: 'scatter', marker: { size: 8 } };
        const traces = Object.keys(speciesMap).map(species => ({
            ...trace,
            x: data.x.filter((_, i) => data.color[i] === species),
            y: data.y.filter((_, i) => data.color[i] === species),
            name: species,
            marker: { ...trace.marker, color: speciesMap[species].color, symbol: speciesMap[species].marker }
        }));
        Plotly.newPlot(plotId, traces, layout);
        titleDiv.innerText = `${data.x_label} vs ${data.y_label}`;
        descDiv.innerText = plotDescriptions.scatter(data.x_label, data.y_label);
        showSnackbar("Custom visualization generated successfully", 'success');
    } else if (plotType === 'boxplot') {
        const traces = [];
        for (const feature of data.features) {
            for (const [species, values] of Object.entries(data.data[feature])) {
                traces.push({
                    y: values,
                    type: 'box',
                    name: `${species} - ${feature}`,
                    marker: { color: speciesMap[species].color }
                });
            }
        }
        Plotly.newPlot(plotId, traces, layout);
        titleDiv.innerText = `Box Plot of ${data.features.join(', ')}`;
        descDiv.innerText = plotDescriptions.boxplot(data.features);
        showSnackbar("Custom visualization generated successfully", 'success');
    } else if (plotType === 'pairplot') {
        const traces = [];
        const n = data.features.length;
        const speciesLegendAdded = {};

        Object.keys(speciesMap).forEach(species => {
            speciesLegendAdded[species] = false;
        });

        const speciesData = {};
        Object.keys(speciesMap).forEach(species => {
            speciesData[species] = data.data.filter(d => d.species === species);
        });

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const xFeature = data.features[j];
                const yFeature = data.features[i];

                if (i === j) {
                    Object.keys(speciesMap).forEach(species => {
                        const values = speciesData[species].map(d => d[xFeature]);
                        traces.push({
                            x: values,
                            type: 'histogram',
                            name: species,
                            marker: { color: speciesMap[species].color },
                            xaxis: `x${j + 1}`,
                            yaxis: `y${i + 1}`,
                            opacity: 0.5,
                            showlegend: !speciesLegendAdded[species]
                        });
                        speciesLegendAdded[species] = true;
                    });
                } else {
                    const scatterTrace = {
                        mode: 'markers',
                        type: 'scattergl',
                        xaxis: `x${j + 1}`,
                        yaxis: `y${i + 1}`,
                        marker: { size: 5 },
                        showlegend: false
                    };
                    Object.keys(speciesMap).forEach(species => {
                        traces.push({
                            ...scatterTrace,
                            x: speciesData[species].map(d => d[xFeature]),
                            y: speciesData[species].map(d => d[yFeature]),
                            name: species,
                            marker: {
                                ...scatterTrace.marker,
                                color: speciesMap[species].color,
                                symbol: speciesMap[species].marker
                            }
                        });
                    });
                }
            }
        }

        layout.grid = { rows: n, columns: n, pattern: 'independent' };

        if (n === 4) {
            layout.xaxis = { domain: [0, 0.24], title: '' };
            layout.xaxis2 = { domain: [0.26, 0.50], title: '' };
            layout.xaxis3 = { domain: [0.52, 0.76], title: '' };
            layout.xaxis4 = { domain: [0.78, 1], title: '' };
            layout.yaxis = { domain: [0.78, 1], title: '' };
            layout.yaxis2 = { domain: [0.52, 0.76], title: '' };
            layout.yaxis3 = { domain: [0.26, 0.50], title: '' };
            layout.yaxis4 = { domain: [0, 0.24], title: '' };

            data.features.forEach((feature, idx) => {
                layout.annotations.push({
                    text: feature,
                    x: (idx * 0.26 + 0.13),
                    y: 1.05,
                    xref: 'paper',
                    yref: 'paper',
                    showarrow: false,
                    font: { size: 12 }
                });
            });

            data.features.forEach((feature, idx) => {
                layout.annotations.push({
                    text: feature,
                    x: -0.15,
                    y: (1 - idx * 0.26 - 0.13),
                    xref: 'paper',
                    yref: 'paper',
                    showarrow: false,
                    font: { size: 12 },
                    textangle: -90
                });
            });
        } else if (n === 2) {
            layout.xaxis = { domain: [0, 0.48], title: '' };
            layout.xaxis2 = { domain: [0.52, 1], title: '' };
            layout.yaxis = { domain: [0.52, 1], title: '' };
            layout.yaxis2 = { domain: [0, 0.48], title: '' };

            data.features.forEach((feature, idx) => {
                layout.annotations.push({
                    text: feature,
                    x: (idx * 0.52 + 0.26),
                    y: 1.05,
                    xref: 'paper',
                    yref: 'paper',
                    showarrow: false,
                    font: { size: 12 }
                });
            });

            data.features.forEach((feature, idx) => {
                layout.annotations.push({
                    text: feature,
                    x: -0.15,
                    y: (1 - idx * 0.52 - 0.26),
                    xref: 'paper',
                    yref: 'paper',
                    showarrow: false,
                    font: { size: 12 },
                    textangle: -90
                });
            });
        }

        Plotly.newPlot(plotId, traces, layout);
        titleDiv.innerText = 'Pairplot of Iris Features by Species';
        descDiv.innerText = plotDescriptions.pairplot;
        showSnackbar("Custom visualization generated successfully", 'success');
    }
});

// Upload and Retrain
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const resultDiv = document.getElementById('upload-result');
    if (!response.ok) {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Upload failed. Please check the file and try again.';
        return;
    }
    const data = await response.json();
    showSnackbar("File uploaded successfully", 'success');
    resultDiv.innerText = data.message;
});

document.getElementById('retrain-button').addEventListener('click', async () => {
    const response = await fetch('/api/retrain', { method: 'POST' });
    const resultDiv = document.getElementById('retrain-result');
    const choiceDiv = document.getElementById('retrain-choice');
    if (!response.ok) {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Retrain failed. Please try again.';
        return;
    }
    const data = await response.json();
    showSnackbar("Model retrained successfully", 'success');
    resultDiv.innerText = data.message;
    document.getElementById('old-accuracy').innerText = data.old_metrics ? data.old_metrics.accuracy.toFixed(3) : 'N/A';
    document.getElementById('new-accuracy').innerText = data.new_metrics.accuracy.toFixed(3);
    choiceDiv.classList.remove('hidden');
});

// **Key Changes Here: Corrected /api/save_retrain Requests**
document.getElementById('save-button').addEventListener('click', async () => {
    const response = await fetch('/api/save_retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true) // Sends "true" instead of {"save": true}
    });
    const resultDiv = document.getElementById('retrain-result');
    if (response.ok) {
        const data = await response.json();
        showSnackbar(data.message, 'success');
        resultDiv.innerText = data.message;
        document.getElementById('retrain-choice').classList.add('hidden');
    } else {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Failed to save new model.';
    }
});

document.getElementById('discard-button').addEventListener('click', async () => {
    const response = await fetch('/api/save_retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(false) // Sends "false" instead of {"save": false}
    });
    const resultDiv = document.getElementById('retrain-result');
    if (response.ok) {
        const data = await response.json();
        showSnackbar(data.message, 'success');
        resultDiv.innerText = data.message;
        document.getElementById('retrain-choice').classList.add('hidden');
    } else {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Failed to discard new model.';
    }
});

// Evaluation
document.getElementById('evaluate-button').addEventListener('click', async () => {
    const response = await fetch('/api/evaluate');
    const resultDiv = document.getElementById('evaluation-result');
    if (!response.ok) {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
        resultDiv.innerText = 'Evaluation failed. Please try again.';
        return;
    }
    const data = await response.json();
    showSnackbar("Evaluation successful", 'success');
    resultDiv.innerText = `Accuracy: ${data.accuracy.toFixed(3)}\n${JSON.stringify(data.classification_report, null, 2)}`;
});
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

// Snackbar Function with improved animation
function showSnackbar(message, type) {
    const snackbar = document.getElementById("snackbar");
    snackbar.innerText = message;
    snackbar.className = type; // 'success' or 'error'
    snackbar.classList.add("show");
    setTimeout(() => {
        snackbar.classList.remove("show");
    }, 3000); // Hide after 3 seconds
}

// Progress overlay for retraining
function showProgress(show) {
    const overlay = document.getElementById('progress-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// File upload visual enhancement
document.addEventListener('DOMContentLoaded', function() {
    const fileUpload = document.getElementById('file-upload');
    const fileUploadLabel = document.querySelector('.file-upload');

    fileUploadLabel.addEventListener('click', function() {
        fileUpload.click();
    });

    fileUploadLabel.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUploadLabel.classList.add('active');
    });

    fileUploadLabel.addEventListener('dragleave', function() {
        fileUploadLabel.classList.remove('active');
    });

    fileUploadLabel.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUploadLabel.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            fileUpload.files = e.dataTransfer.files;
            const filename = fileUpload.files[0].name;
            showSnackbar(`File selected: ${filename}`, 'success');
        }
    });

    fileUpload.addEventListener('change', function() {
        if (fileUpload.files.length) {
            const filename = fileUpload.files[0].name;
            showSnackbar(`File selected: ${filename}`, 'success');
        }
    });
});

// Predict
document.getElementById('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="number"]');
    if (Array.from(inputs).some(input => !input.value)) {
        showSnackbar("Please fill in all four feature values", 'error');
        return;
    }
    const features = Array.from(inputs).map(input => parseFloat(input.value));
    
    try {
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
        
        // Create a more attractive result display
        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 20px; font-weight: 600; color: #3a7bd5;">Predicted: ${data.prediction}</span>
                </div>
                <div style="font-size: 14px; color: #718096;">
                    Probabilities: ${data.probabilities.map(p => p.toFixed(3)).join(', ')}
                </div>
            </div>
        `;
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

// Load Default Visualizations with improved styling
async function loadDefaultVisualizations() {
    const plots = [
        { id: 'scatter-plot', type: 'scatter', features: 'petal length (cm),petal width (cm)', descId: 'scatter-description', title: 'Petal Length vs Petal Width' },
        { id: 'box-plot', type: 'boxplot', features: 'petal length (cm)', descId: 'box-description', title: 'Petal Length Distribution by Species' },
        { id: 'pair-plot', type: 'pairplot', features: '', descId: 'pair-description', title: 'Pairplot of Iris Features by Species' }
    ];
    
    for (const plot of plots) {
        try {
            const response = await fetch(`/api/visualization?plot_type=${plot.type}&features=${plot.features}`);
            const descDiv = document.getElementById(plot.descId);
            
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
                height: isPairplot ? 800 : 450,
                margin: { t: 20, b: 50, l: 70, r: 50 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { family: '-apple-system, BlinkMacSystemFont, "San Francisco", Arial, sans-serif' },
                legend: {
                    x: 1,
                    y: 1,
                    xanchor: 'right',
                    yanchor: 'top',
                    bgcolor: 'rgba(255,255,255,0.8)',
                    bordercolor: 'rgba(0,0,0,0.1)',
                    borderwidth: 1
                },
                annotations: []
            };
            
            if (plot.type === 'scatter') {
                const trace = { x: data.x, y: data.y, mode: 'markers', type: 'scatter', marker: { size: 10 } };
                const traces = Object.keys(speciesMap).map(species => ({
                    ...trace,
                    x: data.x.filter((_, i) => data.color[i] === species),
                    y: data.y.filter((_, i) => data.color[i] === species),
                    name: species,
                    marker: { 
                        ...trace.marker, 
                        color: speciesMap[species].color, 
                        symbol: speciesMap[species].marker,
                        opacity: 0.9,
                        line: { width: 1, color: 'rgba(255,255,255,0.5)' }
                    }
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
                            marker: { 
                                color: speciesMap[species].color,
                                outliercolor: speciesMap[species].color,
                                opacity: 0.8 
                            },
                            boxmean: true,
                            boxpoints: 'suspectedoutliers'
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
                                    marker: { 
                                        color: speciesMap[species].color,
                                        opacity: 0.7,
                                        line: { width: 1, color: 'white' }
                                    },
                                    xaxis: `x${j + 1}`,
                                    yaxis: `y${i + 1}`,
                                    opacity: 0.6,
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
                                marker: { size: 6 },
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
                                        symbol: speciesMap[species].marker,
                                        opacity: 0.8,
                                        line: { width: 0.5, color: 'white' }
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
                            font: { size: 12, color: '#555' }
                        });
                    });
                    
                    data.features.forEach((feature, idx) => {
                        layout.annotations.push({
                            text: feature,
                            x: -0.05,
                            y: (1 - idx * 0.26 - 0.13),
                            xref: 'paper',
                            yref: 'paper',
                            showarrow: false,
                            font: { size: 12, color: '#555' },
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
                            font: { size: 12, color: '#555' }
                        });
                    });
                    
                    data.features.forEach((feature, idx) => {
                        layout.annotations.push({
                            text: feature,
                            x: -0.05,
                            y: (1 - idx * 0.52 - 0.26),
                            xref: 'paper',
                            yref: 'paper',
                            showarrow: false,
                            font: { size: 12, color: '#555' },
                            textangle: -90
                        });
                    });
                }
                
                Plotly.newPlot(plot.id, traces, layout);
                descDiv.innerText = plotDescriptions.pairplot;
            }
        } catch (error) {
            console.error(`Failed to load ${plot.type} plot:`, error);
            showSnackbar(`Error loading visualization: ${error.message || 'Unknown error'}`, 'error');
        }
    }
}

// Initialize visualizations when page loads
document.addEventListener('DOMContentLoaded', loadDefaultVisualizations);

// Custom Visualization Form
document.getElementById('visualization-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const plotType = form.plot_type.value;
    const featuresInput = form.features.value.trim();
    const features = featuresInput ? featuresInput.split(',').map(f => f.trim()) : [];

    // Client-side validation with snackbars
    if (plotType === 'scatter' && features.length !== 2) {
        showSnackbar("Please provide exactly two features for the scatter plot, separated by commas", 'error');
        return;
    } else if (plotType === 'boxplot' && features.length === 0) {
        showSnackbar("Please provide at least one feature for the boxplot", 'error');
        return;
    }

    try {
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
        
        let plotTitle = '';
        if (plotType === 'scatter') {
            plotTitle = `${data.x_label} vs ${data.y_label}`;
        } else if (plotType === 'boxplot') {
            plotTitle = `Box Plot of ${data.features.join(', ')}`;
        } else if (plotType === 'pairplot') {
            plotTitle = 'Pairplot of Iris Features by Species';
        }
        
        wrapper.innerHTML = `
            <div class="plot-title">${plotTitle}</div>
            <div class="plot" id="${plotId}"></div>
            <div class="plot-description"></div>
            <button class="remove-plot" style="position: absolute; top: 16px; right: 16px; background: none; color: #718096; box-shadow: none; padding: 4px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        
        // Make the wrapper have position relative for the close button
        wrapper.style.position = 'relative';
        
        customPlotsContainer.prepend(wrapper);
        
        const isPairplot = plotType === 'pairplot';
        const layout = {
            autosize: true,
            height: isPairplot ? 800 : 450,
            margin: { t: 20, b: 50, l: 70, r: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: '-apple-system, BlinkMacSystemFont, "San Francisco", Arial, sans-serif' },
            legend: {
                x: 1,
                y: 1,
                xanchor: 'right',
                yanchor: 'top',
                bgcolor: 'rgba(255,255,255,0.8)',
                bordercolor: 'rgba(0,0,0,0.1)',
                borderwidth: 1
            },
            annotations: []
        };
        
        const descDiv = wrapper.querySelector('.plot-description');
        
        if (plotType === 'scatter') {
            const trace = { x: data.x, y: data.y, mode: 'markers', type: 'scatter', marker: { size: 10 } };
            const traces = Object.keys(speciesMap).map(species => ({
                ...trace,
                x: data.x.filter((_, i) => data.color[i] === species),
                y: data.y.filter((_, i) => data.color[i] === species),
                name: species,
                marker: { 
                    ...trace.marker, 
                    color: speciesMap[species].color, 
                    symbol: speciesMap[species].marker,
                    opacity: 0.9,
                    line: { width: 1, color: 'rgba(255,255,255,0.5)' }
                }
            }));
            Plotly.newPlot(plotId, traces, layout);
            descDiv.innerText = plotDescriptions.scatter(data.x_label, data.y_label);
        } else if (plotType === 'boxplot') {
            const traces = [];
            for (const feature of data.features) {
                for (const [species, values] of Object.entries(data.data[feature])) {
                    traces.push({
                        y: values,
                        type: 'box',
                        name: `${species} - ${feature}`,
                        marker: { 
                            color: speciesMap[species].color,
                            outliercolor: speciesMap[species].color,
                            opacity: 0.8 
                        },
                        boxmean: true,
                        boxpoints: 'suspectedoutliers'
                    });
                }
            }
            Plotly.newPlot(plotId, traces, layout);
            descDiv.innerText = plotDescriptions.boxplot(data.features);
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
                                marker: { 
                                    color: speciesMap[species].color,
                                    opacity: 0.7 
                                },
                                xaxis: `x${j + 1}`,
                                yaxis: `y${i + 1}`,
                                opacity: 0.6,
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
                            marker: { size: 6 },
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
                                    symbol: speciesMap[species].marker,
                                    opacity: 0.8
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
                        x: -0.05,
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
                        x: -0.05,
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
            descDiv.innerText = plotDescriptions.pairplot;
        }
        
        showSnackbar("Custom visualization generated successfully", 'success');
        
        // Add event listener to remove button
        const removeButton = wrapper.querySelector('.remove-plot');
        removeButton.addEventListener('click', () => {
            wrapper.remove();
        });
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

// Upload and Retrain
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (!formData.get('file').name) {
        showSnackbar("Please select a file to upload", 'error');
        return;
    }
    
    try {
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
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.5839C12.7674 22.1952 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="#3a7bd5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 4L12 14.01L9 11.01" stroke="#3a7bd5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${data.message}</span>
            </div>
        `;
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

document.getElementById('retrain-button').addEventListener('click', async () => {
    // Show progress overlay
    showProgress(true);
    
    try {
        const response = await fetch('/api/retrain', { method: 'POST' });
        const resultDiv = document.getElementById('retrain-result');
        const choiceDiv = document.getElementById('retrain-choice');
        
        if (!response.ok) {
            const errorData = await response.json();
            showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
            resultDiv.innerText = 'Retrain failed. Please try again.';
            showProgress(false);
            return;
        }
        
        const data = await response.json();
        showSnackbar("Model retrained successfully", 'success');
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.5839C12.7674 22.1952 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="#3a7bd5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 4L12 14.01L9 11.01" stroke="#3a7bd5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>${data.message}</span>
            </div>
        `;
        
        document.getElementById('old-accuracy').innerText = data.old_metrics ? data.old_metrics.accuracy.toFixed(3) : 'N/A';
        document.getElementById('new-accuracy').innerText = data.new_metrics.accuracy.toFixed(3);
        choiceDiv.classList.remove('hidden');
        
        // Highlight the better model
        const oldAccuracy = data.old_metrics ? data.old_metrics.accuracy : 0;
        const newAccuracy = data.new_metrics.accuracy;
        
        if (newAccuracy > oldAccuracy) {
            document.getElementById('new-accuracy').style.color = '#38A169'; // Green for improvement
            document.getElementById('new-accuracy').parentElement.style.boxShadow = '0 0 0 2px rgba(56, 161, 105, 0.2)';
        } else if (oldAccuracy > newAccuracy) {
            document.getElementById('old-accuracy').style.color = '#38A169'; // Green for better performance
            document.getElementById('old-accuracy').parentElement.style.boxShadow = '0 0 0 2px rgba(56, 161, 105, 0.2)';
        }
        
        showProgress(false);
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
        showProgress(false);
    }
});

document.getElementById('save-button').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/save_retrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(true) // Sends "true" instead of {"save": true}
        });
        
        const resultDiv = document.getElementById('retrain-result');
        
        if (response.ok) {
            const data = await response.json();
            showSnackbar(data.message, 'success');
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.5839C12.7674 22.1952 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="#38A169" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 4L12 14.01L9 11.01" stroke="#38A169" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${data.message}</span>
                </div>
            `;
            document.getElementById('retrain-choice').classList.add('hidden');
        } else {
            const errorData = await response.json();
            showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
            resultDiv.innerText = 'Failed to save new model.';
        }
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

document.getElementById('discard-button').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/save_retrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(false) // Sends "false" instead of {"save": false}
        });
        
        const resultDiv = document.getElementById('retrain-result');
        
        if (response.ok) {
            const data = await response.json();
            showSnackbar(data.message, 'success');
            resultDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#718096" stroke-width="2"/>
                        <path d="M15 9L9 15" stroke="#718096" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 9L15 15" stroke="#718096" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>${data.message}</span>
                </div>
            `;
            document.getElementById('retrain-choice').classList.add('hidden');
        } else {
            const errorData = await response.json();
            showSnackbar(`Error: ${errorData.detail || 'An error occurred'}`, 'error');
            resultDiv.innerText = 'Failed to discard new model.';
        }
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

// Evaluation
document.getElementById('evaluate-button').addEventListener('click', async () => {
    try {
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
        
        // Format the classification report for better display
        const report = data.classification_report;
        let reportHTML = `<div style="font-family: monospace;">`;
        reportHTML += `<div style="margin-bottom: 16px;"><strong>Accuracy:</strong> ${data.accuracy.toFixed(3)}</div>`;
        reportHTML += `<table style="width: 100%; border-collapse: collapse;">`;
        reportHTML += `<tr style="border-bottom: 1px solid #edf2f7; background: #f8fafc;">
                        <th style="text-align: left; padding: 8px 12px;">Class</th>
                        <th style="text-align: center; padding: 8px 12px;">Precision</th>
                        <th style="text-align: center; padding: 8px 12px;">Recall</th>
                        <th style="text-align: center; padding: 8px 12px;">F1-Score</th>
                        <th style="text-align: center; padding: 8px 12px;">Support</th>
                      </tr>`;
                      
        for (const [cls, metrics] of Object.entries(report)) {
            if (cls !== 'accuracy' && cls !== 'macro avg' && cls !== 'weighted avg') {
                reportHTML += `<tr style="border-bottom: 1px solid #edf2f7;">
                            <td style="padding: 8px 12px;"><strong>${cls}</strong></td>
                            <td style="text-align: center; padding: 8px 12px;">${metrics.precision.toFixed(3)}</td>
                            <td style="text-align: center; padding: 8px 12px;">${metrics.recall.toFixed(3)}</td>
                            <td style="text-align: center; padding: 8px 12px;">${metrics['f1-score'].toFixed(3)}</td>
                            <td style="text-align: center; padding: 8px 12px;">${metrics.support}</td>
                          </tr>`;
            }
        }
        
        // Add averages
        const macroAvg = report['macro avg'];
        const weightedAvg = report['weighted avg'];
        
        reportHTML += `<tr style="border-bottom: 1px solid #edf2f7; background: #f8fafc;">
                      <td style="padding: 8px 12px;"><strong>Macro Avg</strong></td>
                      <td style="text-align: center; padding: 8px 12px;">${macroAvg.precision.toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${macroAvg.recall.toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${macroAvg['f1-score'].toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${macroAvg.support}</td>
                    </tr>`;
        
        reportHTML += `<tr style="background: #f8fafc;">
                      <td style="padding: 8px 12px;"><strong>Weighted Avg</strong></td>
                      <td style="text-align: center; padding: 8px 12px;">${weightedAvg.precision.toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${weightedAvg.recall.toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${weightedAvg['f1-score'].toFixed(3)}</td>
                      <td style="text-align: center; padding: 8px 12px;">${weightedAvg.support}</td>
                    </tr>`;
        
        reportHTML += `</table></div>`;
        
        resultDiv.innerHTML = reportHTML;
    } catch (error) {
        showSnackbar(`Error: ${error.message || 'An unknown error occurred'}`, 'error');
    }
});

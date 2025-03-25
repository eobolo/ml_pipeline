document.addEventListener("DOMContentLoaded", () => {
    const featuresContainer = document.getElementById("features-container");
    const predictButton = document.getElementById("predict-button");
    const predictionResult = document.getElementById("prediction-result");
    const defaultVisualizations = document.getElementById("default-visualizations");
    const customVisualization = document.getElementById("custom-visualization");
    const generateCustomPlotButton = document.getElementById("generate-custom-plot");
    const uploadButton = document.getElementById("upload-button");
    const uploadResult = document.getElementById("upload-result");
    const retrainButton = document.getElementById("retrain-button");
    const evaluateButton = document.getElementById("evaluate-button");
    const saveRetrainButton = document.getElementById("save-retrain-button");
    const retrainResult = document.getElementById("retrain-result");
    const evaluationResult = document.getElementById("evaluation-result");
    const saveRetrainResult = document.getElementById("save-retrain-result");

    // Grade mapping for colors and markers
    const gradeMap = {
        'Fail': { color: '#E41A1C', marker: 'circle' },
        'DD': { color: '#FF7F00', marker: 'square' },
        'DC': { color: '#FFBF00', marker: 'diamond' },
        'CC': { color: '#4DAF4A', marker: 'triangle-up' },
        'CB': { color: '#377EB8', marker: 'triangle-down' },
        'BB': { color: '#984EA3', marker: 'pentagon' },
        'BA': { color: '#F781BF', marker: 'star' },
        'AA': { color: '#999999', marker: 'hexagon' }
    };

    // Function to fetch and populate features
    function loadFeatures() {
        featuresContainer.innerHTML = ""; // Clear existing features
        fetch("/api/features")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                data.features.forEach(feature => {
                    const featureGroup = document.createElement("div");
                    featureGroup.className = "feature-group";

                    const label = document.createElement("label");
                    label.textContent = feature.feature;
                    label.setAttribute("for", feature.feature.replace(/\s+/g, "-").toLowerCase());

                    const select = document.createElement("select");
                    select.id = feature.feature.replace(/\s+/g, "-").toLowerCase();
                    select.name = feature.feature;

                    feature.options.forEach(option => {
                        const optionElement = document.createElement("option");
                        optionElement.value = option.value;
                        optionElement.textContent = option.label;
                        select.appendChild(optionElement);
                    });

                    featureGroup.appendChild(label);
                    featureGroup.appendChild(select);
                    featuresContainer.appendChild(featureGroup);
                });
            })
            .catch(error => {
                console.error("Error fetching features:", error);
                featuresContainer.innerHTML = "<p>Error loading features. Please try again later.</p>";
            });
    }

    // Function to fetch and render default visualizations
    function loadDefaultVisualizations() {
        defaultVisualizations.innerHTML = ""; // Clear existing visualizations
        fetch("/api/visualizations/default")
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.json();
            })
            .then(visualizations => {
                // console.log("Default visualizations data:", visualizations);
                visualizations.forEach((vis, index) => {
                    const title = document.createElement("h3");
                    title.textContent = vis.title;
                    defaultVisualizations.appendChild(title);

                    const plotDiv = document.createElement("div");
                    plotDiv.id = `default-plot-${index}`;
                    defaultVisualizations.appendChild(plotDiv);
                    // console.log(`Rendering plot ${index}:`, vis.plot_data);
                    renderPlot(vis.plot_data, plotDiv.id);

                    const interpretation = document.createElement("p");
                    interpretation.textContent = vis.interpretation;
                    defaultVisualizations.appendChild(interpretation);
                });
            })
            .catch(error => {
                console.error("Error fetching default visualizations:", error);
                defaultVisualizations.innerHTML = "<p>Error loading default visualizations.</p>";
            });
    }

    // Initial load
    loadFeatures();
    loadDefaultVisualizations();

    // Handle prediction
    predictButton.addEventListener("click", () => {
        const features = Array.from(document.querySelectorAll("#features-container select")).map(select => parseInt(select.value));
        fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ features })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                predictionResult.textContent = `Predicted Grade: ${data.prediction} (${data.meaning})`;
            })
            .catch(error => {
                console.error("Error making prediction:", error);
                predictionResult.textContent = "Error making prediction. Please try again.";
            });
    });

    // Handle file upload
    uploadButton.addEventListener("click", () => {
        const fileInput = document.getElementById("file-upload");
        const file = fileInput.files[0];
        if (!file) {
            uploadResult.textContent = "Please select a file.";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        fetch("/api/upload", {
            method: "POST",
            body: formData
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                uploadResult.textContent = data.message;
                // Refresh features and visualizations after upload
                loadFeatures();
                loadDefaultVisualizations();
                customVisualization.innerHTML = ""; // Clear custom visualization
            })
            .catch(error => {
                console.error("Error uploading file:", error);
                uploadResult.textContent = `Error: ${error.message}`;
            });
    });

    // Handle custom visualization
    generateCustomPlotButton.addEventListener("click", () => {
        const plotType = document.getElementById("plot-type").value;
        const featuresInput = document.getElementById("features").value;
        const features = featuresInput ? featuresInput.split(",").map(f => f.trim()) : [];

        if (!plotType) {
            customVisualization.innerHTML = "<p>Please select a plot type.</p>";
            return;
        }

        if (plotType === "scatter" && features.length !== 2) {
            customVisualization.innerHTML = "<p>Scatter plot requires exactly 2 features.</p>";
            return;
        }
        if (plotType === "pairplot" && features.length !== 2) {
            customVisualization.innerHTML = "<p>Pairplot requires exactly 2 features.</p>";
            return;
        }

        fetch("/api/visualizations/custom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plot_type: plotType, features })
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                customVisualization.innerHTML = "";
                const plotDiv = document.createElement("div");
                plotDiv.id = "custom-plot";
                customVisualization.appendChild(plotDiv);
                renderPlot(data.plot_data, plotDiv.id);
            })
            .catch(error => {
                console.error("Error generating custom visualization:", error);
                customVisualization.innerHTML = "<p>Error generating visualization. Check your inputs.</p>";
            });
    });

    // Handle retrain
    retrainButton.addEventListener("click", () => {
        retrainResult.innerHTML = "<p>Retraining model...</p>";
        fetch("/api/retrain", { method: "POST" })
            .then(response => response.json())
            .then(data => {
                retrainResult.innerHTML = `
                <p>${data.message}</p>
                <p>Old Metrics: ${JSON.stringify(data.old_metrics || 'N/A')}</p>
                <p>New Metrics: ${JSON.stringify(data.new_metrics)}</p>
            `;
            })
            .catch(error => {
                retrainResult.innerHTML = `<p>Error retraining model: ${error.message}</p>`;
            });
    });

    // Handle evaluate
    evaluateButton.addEventListener("click", () => {
        evaluationResult.innerHTML = "<p>Evaluating model...</p>";
        fetch("/api/evaluate")
            .then(response => response.json())
            .then(data => {
                evaluationResult.innerHTML = `
                <p>Metrics: ${JSON.stringify(data.metrics)}</p>
            `;
                if (data.confusion_matrix) {
                    const plotDiv = document.createElement("div");
                    plotDiv.id = "confusion-matrix-plot";
                    evaluationResult.appendChild(plotDiv);
                    renderPlot(data.confusion_matrix, plotDiv.id);
                }
            })
            .catch(error => {
                evaluationResult.innerHTML = `<p>Error evaluating model: ${error.message}</p>`;
            });
    });

    // Handle save retrain
    saveRetrainButton.addEventListener("click", () => {
        const save = document.getElementById("save-retrain").checked;
        fetch("/api/save_retrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(save)
        })
            .then(response => response.json())
            .then(data => {
                saveRetrainResult.innerHTML = `<p>${data.message}</p>`;
            })
            .catch(error => {
                saveRetrainResult.innerHTML = `<p>Error saving retrain decision: ${error.message}</p>`;
            });
    });
    // Function to render Plotly plots dynamically
    function renderPlot(plotData, plotId) {
        if (!plotData || !plotData.type) {
            console.error("Invalid plotData:", plotData);
            document.getElementById(plotId).innerHTML = "<p>Error: Invalid plot data.</p>";
            return;
        }

        const layout = {
            autosize: true,
            height: plotData.type === "pairplot" ? 600 : 450,
            margin: { t: 50, b: 50, l: 70, r: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Arial, sans-serif' },
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
        if (plotData.type === "confusion_matrix") {
            console.log("Confusion Matrix Data:", plotData); // Debug log

            const trace = {
                z: plotData.confusion_matrix,
                x: plotData.labels,
                y: plotData.labels,
                type: 'heatmap',
                colorscale: 'Viridis',
                showscale: true,
                hoverinfo: 'x+y+z'
            };

            // Add annotations for each cell
            for (let i = 0; i < plotData.labels.length; i++) {
                for (let j = 0; j < plotData.labels.length; j++) {
                    layout.annotations.push({
                        x: plotData.labels[j],
                        y: plotData.labels[i],
                        text: plotData.confusion_matrix[i][j].toString(),
                        showarrow: false,
                        font: {
                            size: 12,
                            color: 'white' // White for Viridis; adjust if colorscale changes
                        },
                        xref: 'x',
                        yref: 'y'
                    });
                }
            }

            layout.title = 'Confusion Matrix';
            layout.xaxis = { title: 'Predicted Grade' };
            layout.yaxis = { title: 'True Grade' };
            layout.height = 500; // Adjusted for readability

            Plotly.newPlot(plotId, [trace], layout).catch(err => {
                console.error("Plotly rendering error:", err);
            });
        } else if (plotData.type === "histogram") {
            const traces = plotData.features.map((feature, idx) => ({
                x: plotData.data[feature].values,
                type: "histogram",
                name: feature,
                nbinsx: plotData.data[feature].bins,
                marker: { color: `hsl(${idx * 60}, 70%, 50%)` },
                opacity: 0.7
            }));
            layout.title = `Histogram of ${plotData.features.join(", ")}`;
            layout.xaxis = { title: "Value" };
            layout.yaxis = { title: "Frequency" };
            layout.barmode = "overlay";
            Plotly.newPlot(plotId, traces, layout);
        } else if (plotData.type === "scatter") {
            const features = plotData.features || [plotData.x_label, plotData.y_label];
            const includesGrade = features.includes("Output Grade");
            if (includesGrade) {
                const traces = Object.keys(gradeMap).map(grade => ({
                    x: plotData.x.filter((_, i) => plotData.color[i] === grade),
                    y: plotData.y.filter((_, i) => plotData.color[i] === grade),
                    mode: "markers",
                    type: "scatter",
                    name: grade,
                    marker: {
                        size: 10,
                        color: gradeMap[grade].color,
                        symbol: gradeMap[grade].marker,
                        opacity: 0.8,
                        line: { width: 1, color: "rgba(255,255,255,0.5)" }
                    }
                }));
                layout.title = `Scatter Plot: ${plotData.x_label} vs ${plotData.y_label}`;
                layout.xaxis = { title: plotData.x_label };
                layout.yaxis = { title: plotData.y_label };
                Plotly.newPlot(plotId, traces, layout);
            } else {
                const trace = {
                    x: plotData.x,
                    y: plotData.y,
                    mode: "markers",
                    type: "scatter",
                    marker: { size: 8, color: "#1f77b4" }
                };
                layout.title = `Scatter Plot: ${plotData.x_label} vs ${plotData.y_label}`;
                layout.xaxis = { title: plotData.x_label };
                layout.yaxis = { title: plotData.y_label };
                Plotly.newPlot(plotId, [trace], layout);
            }
        } else if (plotData.type === "boxplot") {
            const traces = [];
            plotData.features.forEach(feature => {
                for (const grade in plotData.data[feature]) {
                    traces.push({
                        y: plotData.data[feature][grade],
                        type: "box",
                        name: grade,
                        marker: {
                            color: gradeMap[grade]?.color || "#2ca02c",
                            opacity: 0.8
                        },
                        boxmean: true,
                        boxpoints: "suspectedoutliers"
                    });
                }
            });
            layout.title = `Box Plot: ${plotData.features.join(", ")} by Grade`;
            layout.yaxis = { title: plotData.features.length > 1 ? "Value" : plotData.features[0] };
            Plotly.newPlot(plotId, traces, layout);
        } else if (plotData.type === "barplot") {
            const traces = plotData.features.map(feature => {
                const x = [];
                const y = [];
                for (const grade in plotData.data[feature]) {
                    x.push(grade);
                    y.push(plotData.data[feature][grade]);
                }
                return {
                    x: x,
                    y: y,
                    type: "bar",
                    name: feature,
                    marker: {
                        color: x.map(grade => gradeMap[grade]?.color || "#d62728"),
                        opacity: 0.8
                    }
                };
            });
            layout.title = `Bar Plot: Average ${plotData.features.join(", ")} by Grade`;
            layout.xaxis = { title: "Grade" };
            layout.yaxis = { title: "Average Value" };
            layout.barmode = plotData.features.length > 1 ? "group" : "stack";
            Plotly.newPlot(plotId, traces, layout);
        } else if (plotData.type === "pairplot") {
            const features = plotData.features;
            const data = plotData.data;
            const traces = [];
            const gradeLegendAdded = {};

            Object.keys(gradeMap).forEach(grade => {
                gradeLegendAdded[grade] = false;
            });

            const gradeData = {};
            Object.keys(gradeMap).forEach(grade => {
                gradeData[grade] = data.filter(row => row.grade_label === grade);
            });

            const technicalColumns = Object.keys(data[0]).filter(key => key !== "grade_label");

            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const xFeature = features[j];
                    const yFeature = features[i];
                    const xTechnical = technicalColumns[j];
                    const yTechnical = technicalColumns[i];

                    if (i === j) {
                        Object.keys(gradeMap).forEach(grade => {
                            const values = gradeData[grade].map(row => row[xTechnical]);
                            traces.push({
                                x: values,
                                type: "histogram",
                                name: grade,
                                marker: { color: gradeMap[grade].color, opacity: 0.7 },
                                xaxis: `x${j + 1}`,
                                yaxis: `y${i + 1}`,
                                opacity: 0.6,
                                showlegend: !gradeLegendAdded[grade]
                            });
                            gradeLegendAdded[grade] = true;
                        });
                    } else {
                        const scatterTrace = {
                            mode: "markers",
                            type: "scattergl",
                            xaxis: `x${j + 1}`,
                            yaxis: `y${i + 1}`,
                            marker: { size: 6 },
                            showlegend: false
                        };
                        Object.keys(gradeMap).forEach(grade => {
                            traces.push({
                                ...scatterTrace,
                                x: gradeData[grade].map(row => row[xTechnical]),
                                y: gradeData[grade].map(row => row[yTechnical]),
                                name: grade,
                                marker: {
                                    color: gradeMap[grade].color,
                                    symbol: gradeMap[grade].marker,
                                    opacity: 0.8
                                }
                            });
                        });
                    }
                }
            }

            layout.grid = { rows: 2, columns: 2, pattern: "independent" };
            layout.xaxis = { domain: [0, 0.48], title: "" };
            layout.xaxis2 = { domain: [0.52, 1], title: "" };
            layout.yaxis = { domain: [0.52, 1], title: "" };
            layout.yaxis2 = { domain: [0, 0.48], title: "" };

            features.forEach((feature, idx) => {
                layout.annotations.push({
                    text: feature,
                    x: idx * 0.52 + 0.26,
                    y: 1.05,
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: { size: 12 }
                });
                layout.annotations.push({
                    text: feature,
                    x: -0.05,
                    y: 1 - (idx * 0.52 + 0.26),
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: { size: 12 },
                    textangle: -90
                });
            });

            layout.title = `Pair Plot of ${features.join(" vs ")}`;
            Plotly.newPlot(plotId, traces, layout);
        }
    }
});
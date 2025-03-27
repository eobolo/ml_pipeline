document.addEventListener("DOMContentLoaded", () => {
    const featuresContainer = document.getElementById("features-container");
    const predictButton = document.getElementById("predict-button");
    const predictionResult = document.getElementById("prediction-result");
    const defaultVisualizations = document.getElementById("default-visualizations");
    const customVisualizationsContainer = document.getElementById("custom-visualizations-container");
    const availableColumnsContainer = document.getElementById("available-columns");
    const generateCustomPlotButton = document.getElementById("generate-custom-plot");
    const uploadButton = document.getElementById("upload-button");
    const uploadResult = document.getElementById("upload-result");
    const retrainButton = document.getElementById("retrain-button");
    const evaluateButton = document.getElementById("evaluate-button");
    const saveRetrainButton = document.getElementById("save-retrain-button");
    const retrainResult = document.getElementById("retrain-result");
    const evaluationResult = document.getElementById("evaluation-result");
    const saveRetrainResult = document.getElementById("save-retrain-result");

    // Maintain a counter for custom visualization IDs
    let customPlotCounter = 0;

    // Store available column names
    let availableColumns = [];

    // Add a snackbar element for notifications
    if (!document.getElementById("snackbar")) {
        const snackbar = document.createElement("div");
        snackbar.id = "snackbar";
        document.body.appendChild(snackbar);
    }

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

    // Mapping of technical column names to user-friendly English names
    const columnNameMapping = {
        'AGE': 'Student Age',
        'GENDER': 'Gender',
        'HS_TYPE': 'High School Type',
        'SCHOLARSHIP': 'Scholarship Type',
        'WORK': 'Additional Work',
        'ACTIVITY': 'Artistic/Sports Activity',
        'PARTNER': 'Has Partner',
        'SALARY': 'Total Salary',
        'TRANSPORT': 'Transportation Method',
        'LIVING': 'Accommodation Type',
        'MOTHER_EDU': "Mother's Education",
        'FATHER_EDU': "Father's Education",
        '#_SIBLINGS': 'Number of Siblings',
        'KIDS': 'Parental Status',
        'MOTHER_JOB': "Mother's Occupation",
        'FATHER_JOB': "Father's Occupation",
        'STUDY_HRS': 'Weekly Study Hours',
        'READ_FREQ': 'Reading Frequency (Non-Scientific)',
        'READ_FREQ_SCI': 'Reading Frequency (Scientific)',
        'ATTEND_DEPT': 'Seminar/Conference Attendance',
        'IMPACT': 'Project Impact',
        'ATTEND': 'Class Attendance',
        'PREP_STUDY': 'Midterm Exam 1 Preparation',
        'PREP_EXAM': 'Midterm Exam 2 Preparation',
        'NOTES': 'Taking Notes in Classes',
        'LISTENS': 'Listening in Classes',
        'LIKES_DISCUSS': 'Discussion Impact',
        'CLASSROOM': 'Flip-Classroom Preference',
        'CUML_GPA': 'Cumulative GPA',
        'EXP_GPA': 'Expected Graduation GPA',
        'COURSE ID': 'Course Identifier',
        'GRADE': 'Output Grade'
    };

    // Create reverse mapping for lookup
    const reverseColumnMapping = {};
    Object.entries(columnNameMapping).forEach(([technical, friendly]) => {
        reverseColumnMapping[friendly.toLowerCase()] = technical;
        // Also add technical name to lookup for convenience
        reverseColumnMapping[technical.toLowerCase()] = technical;
    });

    // Initialize available columns
    Object.values(columnNameMapping).forEach(column => {
        availableColumns.push(column);
    });

    // Show a notification
    function showNotification(message, isSuccess = true) {
        const snackbar = document.getElementById("snackbar");
        snackbar.textContent = message;
        snackbar.className = isSuccess ? "show success" : "show error";
        setTimeout(() => {
            snackbar.className = snackbar.className.replace("show", "");
        }, 3000);
    }

    // Show loading overlay
    function showLoading(message = "Processing...") {
        // Create overlay if it doesn't exist
        if (!document.getElementById("progress-overlay")) {
            const overlay = document.createElement("div");
            overlay.id = "progress-overlay";
            overlay.className = "progress-overlay";

            const card = document.createElement("div");
            card.className = "progress-card";

            const spinner = document.createElement("div");
            spinner.className = "spinner";

            const messageEl = document.createElement("p");
            messageEl.className = "progress-message";
            messageEl.id = "progress-message";
            messageEl.textContent = message;

            const barContainer = document.createElement("div");
            barContainer.className = "progress-bar-container";

            const bar = document.createElement("div");
            bar.className = "progress-bar";

            barContainer.appendChild(bar);
            card.appendChild(spinner);
            card.appendChild(messageEl);
            card.appendChild(barContainer);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        } else {
            // Update message if overlay exists
            document.getElementById("progress-message").textContent = message;
            document.getElementById("progress-overlay").classList.remove("hidden");
        }
    }

    // Hide loading overlay
    function hideLoading() {
        const overlay = document.getElementById("progress-overlay");
        if (overlay) {
            overlay.classList.add("hidden");
        }
    }

    // Display available columns in a grid
    function displayAvailableColumns() {
        const columnsGrid = availableColumnsContainer.querySelector('.columns-grid');
        columnsGrid.innerHTML = '';

        availableColumns.sort().forEach(column => {
            const columnChip = document.createElement('div');
            columnChip.className = 'column-chip';
            columnChip.textContent = column;
            columnChip.addEventListener('click', () => {
                // When clicked, add this column to the input
                const featuresInput = document.getElementById('features');
                const currentValue = featuresInput.value.trim();

                if (currentValue) {
                    featuresInput.value = `${currentValue}, ${column}`;
                } else {
                    featuresInput.value = column;
                }

                // Hide the columns container
                availableColumnsContainer.classList.add('hidden');
            });

            columnsGrid.appendChild(columnChip);
        });

        availableColumnsContainer.classList.remove('hidden');
    }

    // Function to fetch and populate features
    function loadFeatures() {
        featuresContainer.innerHTML = ""; // Clear existing features
        showLoading("Loading features...");

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
                    featureGroup.className = "form-group";

                    const label = document.createElement("label");
                    label.textContent = feature.feature;
                    label.setAttribute("for", feature.feature.replace(/\s+/g, "-").toLowerCase());

                    const select = document.createElement("select");
                    select.id = feature.feature.replace(/\s+/g, "-").toLowerCase();
                    select.name = feature.feature;
                    select.className = "form-control";

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
                hideLoading();
            })
            .catch(error => {
                console.error("Error fetching features:", error);
                featuresContainer.innerHTML = "<p class='error'>Error loading features. Please try again later.</p>";
                showNotification("Failed to load features.", false);
                hideLoading();
            });
    }

    // Function to fetch and render default visualizations
    function loadDefaultVisualizations() {
        defaultVisualizations.innerHTML = ""; // Clear existing visualizations
        showLoading("Loading visualizations...");

        fetch("/api/visualizations/default")
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                return response.json();
            })
            .then(visualizations => {
                visualizations.forEach((vis, index) => {
                    const visItem = document.createElement("div");
                    visItem.className = "visualization-item";

                    const title = document.createElement("h3");
                    title.textContent = vis.title;
                    visItem.appendChild(title);

                    const plotContainer = document.createElement("div");
                    plotContainer.className = "plot-container";
                    plotContainer.id = `default-plot-${index}`;
                    visItem.appendChild(plotContainer);

                    const interpretation = document.createElement("p");
                    interpretation.textContent = vis.interpretation;
                    visItem.appendChild(interpretation);

                    defaultVisualizations.appendChild(visItem);
                });

                // Add a small delay to ensure the DOM is updated
                setTimeout(() => {
                    visualizations.forEach((vis, index) => {
                        renderPlot(vis.plot_data, `default-plot-${index}`);
                    });
                    hideLoading();
                }, 100);
            })
            .catch(error => {
                console.error("Error fetching default visualizations:", error);
                defaultVisualizations.innerHTML = "<p class='error'>Error loading default visualizations.</p>";
                showNotification("Failed to load visualizations.", false);
                hideLoading();
            });
    }

    // Update upload form UI
    function enhanceUploadForm() {
        const uploadForm = document.getElementById("upload-form");
        const fileInput = document.getElementById("file-upload");

        // Hide the original file input
        fileInput.style.display = "none";

        // Create a nicer upload area
        const uploadArea = document.createElement("div");
        uploadArea.className = "upload-area";
        uploadArea.innerHTML = `
            <div class="upload-icon">📤</div>
            <p class="upload-text">Drag & drop your CSV file here or <span class="browse-text">browse</span></p>
        `;

        uploadArea.addEventListener("click", () => {
            fileInput.click();
        });

        // Add drag and drop functionality
        uploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = "#3498db";
            uploadArea.style.background = "#e6f7ff";
        });

        uploadArea.addEventListener("dragleave", () => {
            uploadArea.style.borderColor = "#cbd5e0";
            uploadArea.style.background = "#f9fafc";
        });

        uploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = "#cbd5e0";
            uploadArea.style.background = "#f9fafc";

            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                uploadArea.querySelector(".upload-text").textContent = `Selected: ${fileName}`;
            }
        });

        // Update text when file is selected
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length) {
                const fileName = fileInput.files[0].name;
                uploadArea.querySelector(".upload-text").textContent = `Selected: ${fileName}`;
            }
        });

        // Insert the new upload area before the upload button
        uploadForm.insertBefore(uploadArea, uploadButton);
    }

    // Create a new custom visualization container
    function createCustomVisualizationItem(plotData, plotType, features) {
        customPlotCounter++;
        const plotId = `custom-plot-${customPlotCounter}`;

        const visItem = document.createElement("div");
        visItem.className = "visualization-item";
        visItem.dataset.id = plotId;

        // Create visualization header with title and remove button
        const visHeader = document.createElement("div");
        visHeader.className = "visualization-header";

        let title;
        if (plotType === "scatter" || plotType === "pairplot") {
            title = `${plotType.charAt(0).toUpperCase() + plotType.slice(1)} Plot: ${features.join(" vs ")}`;
        } else {
            title = `${plotType.charAt(0).toUpperCase() + plotType.slice(1)} Plot: ${features.join(", ")}`;
        }

        const titleEl = document.createElement("h3");
        titleEl.textContent = title;

        const removeButton = document.createElement("button");
        removeButton.className = "remove-visualization-btn";
        removeButton.innerHTML = "×";
        removeButton.title = "Remove visualization";
        removeButton.addEventListener("click", (e) => {
            e.preventDefault();
            visItem.remove();
            showNotification("Visualization removed");
        });

        visHeader.appendChild(titleEl);
        visHeader.appendChild(removeButton);
        visItem.appendChild(visHeader);

        // Create plot container
        const plotContainer = document.createElement("div");
        plotContainer.className = "plot-container";
        plotContainer.id = plotId;
        visItem.appendChild(plotContainer);

        // Add to visualizations container
        customVisualizationsContainer.appendChild(visItem);

        return { plotId, visItem };
    }

    // Initial load
    loadFeatures();
    loadDefaultVisualizations();
    enhanceUploadForm();

    // Handle prediction
    predictButton.addEventListener("click", () => {
        const features = Array.from(document.querySelectorAll("#features-container select")).map(select => parseInt(select.value));
        showLoading("Predicting grade...");

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
                predictionResult.innerHTML = `
                    <div class="prediction-result">
                        Predicted Grade: <strong>${data.prediction}</strong>
                        <div>${data.meaning}</div>
                    </div>
                `;
                hideLoading();
                showNotification("Prediction completed successfully!");
            })
            .catch(error => {
                console.error("Error making prediction:", error);
                predictionResult.innerHTML = "<p class='error'>Error making prediction. Please try again.</p>";
                hideLoading();
                showNotification("Error making prediction.", false);
            });
    });

    // Handle file upload
    uploadButton.addEventListener("click", () => {
        const fileInput = document.getElementById("file-upload");
        const file = fileInput.files[0];
        if (!file) {
            showNotification("Please select a file.", false);
            return;
        }

        showLoading("Uploading file...");
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
                uploadResult.innerHTML = `<p>${data.message}</p>`;
                // Refresh features and visualizations after upload
                loadFeatures();
                setTimeout(() => loadDefaultVisualizations(), 500);
                customVisualizationsContainer.innerHTML = ""; // Clear custom visualizations
                customPlotCounter = 0; // Reset counter
                hideLoading();
                showNotification("File uploaded successfully!");
            })
            .catch(error => {
                console.error("Error uploading file:", error);
                uploadResult.innerHTML = `<p class="error">Error: ${error.message}</p>`;
                hideLoading();
                showNotification("Error uploading file.", false);
            });
    });

    // Feature input help - show available columns when clicked
    document.getElementById("features").addEventListener("focus", () => {
        displayAvailableColumns();
    });

    // Hide available columns when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#features") &&
            !e.target.closest("#available-columns") &&
            !availableColumnsContainer.classList.contains("hidden")) {
            availableColumnsContainer.classList.add("hidden");
        }
    });

    // Handle custom visualization
    generateCustomPlotButton.addEventListener("click", () => {
        const plotType = document.getElementById("plot-type").value;
        const featuresInput = document.getElementById("features").value;
        const features = featuresInput ? featuresInput.split(",").map(f => f.trim()) : [];

        if (!plotType) {
            showNotification("Please select a plot type.", false);
            return;
        }

        if (plotType === "scatter" && features.length !== 2) {
            showNotification("Scatter plot requires exactly 2 features.", false);
            return;
        }
        if (plotType === "pairplot" && features.length !== 2) {
            showNotification("Pairplot requires exactly 2 features.", false);
            return;
        }

        // Validate feature names against available columns
        const invalidFeatures = features.filter(feature => {
            return !availableColumns.some(col => col.toLowerCase() === feature.toLowerCase()) &&
                !Object.keys(reverseColumnMapping).includes(feature.toLowerCase());
        });

        if (invalidFeatures.length > 0) {
            showNotification(`Invalid feature name(s): ${invalidFeatures.join(", ")}`, false);
            displayAvailableColumns();
            return;
        }

        showLoading("Generating visualization...");
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
                // Create a new visualization container instead of clearing the existing one
                const { plotId } = createCustomVisualizationItem(data.plot_data, plotType, features);

                // Ensure the container is in the DOM before rendering
                setTimeout(() => {
                    renderPlot(data.plot_data, plotId);
                    hideLoading();
                    showNotification("Visualization generated successfully!");
                }, 100);
            })
            .catch(error => {
                console.error("Error generating custom visualization:", error);

                // Show detailed error information with available columns
                showNotification("Error generating visualization. Check your inputs.", false);
                displayAvailableColumns();

                hideLoading();
            });
    });

    // Handle retrain
    retrainButton.addEventListener("click", () => {
        showLoading("Retraining model...");
        retrainResult.innerHTML = "<p>Retraining model...</p>";

        fetch("/api/retrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}) // Send empty JSON object instead of undefined
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Create model comparison cards
                const comparison = document.createElement("div");
                comparison.className = "model-comparison";

                // Old model card
                const oldCard = document.createElement("div");
                oldCard.className = "model-card";
                oldCard.innerHTML = `
                    <div class="model-title">Original Model</div>
                    <div class="model-metrics">${formatMetrics(data.old_metrics || {})}</div>
                `;

                // New model card
                const newCard = document.createElement("div");
                newCard.className = "model-card";
                newCard.innerHTML = `
                    <div class="model-title">Retrained Model</div>
                    <div class="model-metrics">${formatMetrics(data.new_metrics || {})}</div>
                `;

                comparison.appendChild(oldCard);
                comparison.appendChild(newCard);

                retrainResult.innerHTML = `<p>${data.message}</p>`;
                retrainResult.appendChild(comparison);

                hideLoading();
                showNotification("Model retrained successfully!");
            })
            .catch(error => {
                retrainResult.innerHTML = `<p class='error'>Error retraining model: ${error.message}</p>`;
                hideLoading();
                showNotification("Error retraining model.", false);
            });
    });

    // Handle evaluate
    evaluateButton.addEventListener("click", () => {
        showLoading("Evaluating model...");
        evaluationResult.innerHTML = "<p>Evaluating model...</p>";

        fetch("/api/evaluate")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Evaluation data:", data); // Debug log

                // Format metrics properly
                const formattedMetrics = formatMetrics(data.metrics || {});

                // If there's a classification report, format it
                let reportHTML = '';
                if (data.metrics && data.metrics.classification_report) {
                    reportHTML = formatClassificationReport(data.metrics.classification_report);
                }

                evaluationResult.innerHTML = `
                    <div class="model-card">
                        <div class="model-title">Current Model Metrics</div>
                        <div class="model-metrics">${formattedMetrics}</div>
                        ${reportHTML}
                    </div>
                `;

                if (data.confusion_matrix) {
                    const plotContainer = document.createElement("div");
                    plotContainer.className = "plot-container";
                    plotContainer.id = "confusion-matrix-plot";
                    evaluationResult.appendChild(plotContainer);

                    // Ensure the container is in the DOM before rendering
                    setTimeout(() => {
                        renderPlot(data.confusion_matrix, plotContainer.id);
                    }, 100);
                }

                hideLoading();
                showNotification("Model evaluated successfully!");
            })
            .catch(error => {
                console.error("Error evaluating model:", error);
                evaluationResult.innerHTML = `<p class='error'>Error evaluating model: ${error.message}</p>`;
                hideLoading();
                showNotification("Error evaluating model.", false);
            });
    });

    // Handle save retrain
    saveRetrainButton.addEventListener("click", () => {
        const save = document.getElementById("save-retrain").checked;
        showLoading("Saving model settings...");

        fetch("/api/save_retrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(save)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                saveRetrainResult.innerHTML = `<p>${data.message}</p>`;
                hideLoading();
                showNotification(data.message);
            })
            .catch(error => {
                saveRetrainResult.innerHTML = `<p class='error'>Error saving retrain decision: ${error.message}</p>`;
                hideLoading();
                showNotification("Error saving settings.", false);
            });
    });

    // Function to format metrics for display
    function formatMetrics(metrics) {
        if (!metrics || Object.keys(metrics).length === 0) {
            return "<p>No metrics available</p>";
        }

        let html = "<ul style='list-style: none; padding: 0;'>";

        Object.entries(metrics).forEach(([key, value]) => {
            // Skip the classification_report object, we'll handle it separately
            if (key === 'classification_report') return;

            // Format the key for display
            const formattedKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());

            // Format the value based on its type
            let formattedValue = value;
            if (typeof value === 'number') {
                formattedValue = value.toFixed(4);
            } else if (value === undefined || value === null) {
                formattedValue = 'N/A';
            }

            html += `<li><strong>${formattedKey}:</strong> ${formattedValue}</li>`;
        });

        html += "</ul>";
        return html;
    }

    // Function to format the classification report
    function formatClassificationReport(report) {
        if (!report || typeof report !== 'object') {
            return '';
        }

        let html = `
            <div class="classification-report">
                <h4>Classification Report</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Precision</th>
                            <th>Recall</th>
                            <th>F1-Score</th>
                            <th>Support</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Add rows for each class
        Object.entries(report).forEach(([className, metrics]) => {
            // Skip non-class entries or invalid metrics
            console.log(metrics, className);
            if (className === 'accuracy' || !metrics || typeof metrics !== 'object') return;
        
            // Helper function to format metric values
            const formatMetric = (value, isFloat = true) => {
                if (value === undefined || value === null) return 'N/A';
                return isFloat ? value.toFixed(4) : value;
            };
        
            // Extract and format metrics
            const precision = formatMetric(metrics.precision);
            const recall = formatMetric(metrics.recall);
            const f1Score = formatMetric(metrics['f1-score']);
            const support = formatMetric(metrics.support, false); // Support is an integer
        
            html += `
                <tr>
                    <td>${className}</td>
                    <td>${precision}</td>
                    <td>${recall}</td>
                    <td>${f1Score}</td>
                    <td>${support}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    // Function to render Plotly plots dynamically
    function renderPlot(plotData, plotId) {
        // Ensure the container exists
        const container = document.getElementById(plotId);
        if (!container) {
            console.error(`No DOM element with id '${plotId}' exists on the page.`);
            return;
        }

        if (!plotData || !plotData.type) {
            console.error("Invalid plotData:", plotData);
            container.innerHTML = "<p>Error: Invalid plot data.</p>";
            return;
        }

        const layout = {
            autosize: true,
            height: plotData.type === "pairplot" ? 600 : 450,
            margin: { t: 50, b: 50, l: 70, r: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Inter, sans-serif' },
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

// Model
const Model = {
  getColorScale() {
    const numColors = 7; // Number of colors in the rainbow scale
    const colors = [];
    const startColor = chroma('#9400D3'); // Starting color of the rainbow
    const endColor = chroma('#FF0000'); // Ending color of the rainbow
    for (let i = 0; i < numColors; i++) {
      const color = chroma.mix(startColor, endColor, i / (numColors - 1));
      colors.push(color.hex());
    }
    const colorScale = chroma.scale(colors);
    return colorScale;
  },
  selectValueOfPolygon(layer, polygon, selectedProduct, selectedStartDate, selectedEndDate, hours) {
    return new Promise((resolve, reject) => {
      // Convert the polygon data to a JSON string
      const polygonJSON = JSON.stringify(polygon);
      // Create a FormData object to send the data as multipart/form-data
      const formData = new FormData();
      formData.append("polygon", polygonJSON);
      formData.append("product", selectedProduct);
      formData.append("start_date", selectedStartDate);
      formData.append("end_date", selectedEndDate);
      formData.append("hours", hours);
      // Send the AJAX request to the backend
      $.ajax({
        url: "select-value-of-polygon/",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
          layer.bindPopup(
            "<h6>Date: From" +
            selectedStartDate + " To " + selectedEndDate +
            "</h6>" +
            "<p>Mean Value: " +
            response.mean +
            "</p>" +
            "<p>Minimum Value: " +
            response.min +
            "</p>" +
            "<p>Maximum Value: " +
            response.max +
            "</p>"
          );
          resolve(response);
        },
        error: function (error) {
          console.log("Error:", error);
        },
      });
    });
  },

  selectValueOfPoint(layer, lat, lng, selectedProduct, selectedStartDate, selectedEndDate, hours) {
    const formData = new FormData();
    formData.append("lat", lat);
    formData.append("lng", lng);
    formData.append("product", selectedProduct);
    formData.append("start_date", selectedStartDate);
    formData.append("end_date", selectedEndDate);
    formData.append("hours", hours);
    return new Promise(function (resolve, reject) {
      // Send AJAX request to the backend
      $.ajax({
        url: "find-by-pixel/",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
          layer.bindPopup(
            "<p>Coordinates: (" +
            lat.toFixed(2) +
            ", " +
            lng.toFixed(2) +
            ")</p>")
          resolve(response);
        },
        error: function (error) {
          console.log("Error:", error);
        },
      });
    });
  },

  generateLegend(minValue, maxValue, product) {
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function (map) {
      const div = L.DomUtil.create("div", "legend");
      div.style.background = "#FFF";
      div.style.opacity = "0.9";
      div.style.padding = "20px";
      var colorScale;
      if(product=="sm"){
        colorScale= chroma.scale(['#063195',"#62baca"]).domain([minValue, maxValue]).mode('lrgb');
      }else{
        colorScale = chroma.scale(["#d6e633",'#d67533']).domain([minValue, maxValue]).mode('lrgb');
      }
      //"red", 'yellow', "orange", "green", 'blue'

      const numGrades = 9; // Number of color grades
      const step = (maxValue - minValue) / numGrades;

      for (let i = 0; i < numGrades; i++) {
        const gradeValue = minValue + i * step;
        const color = colorScale(gradeValue).hex();
        const nextGradeValue = gradeValue + step;

        div.innerHTML +=
          '<i style="background:' + color + '"></i> ' +
          gradeValue.toFixed(2) + (nextGradeValue ? '&ndash;' + nextGradeValue.toFixed(2) + '<br>' : '+');
      }

      return div;
    };

    return legend;
  },
  clearMap(drawnItems, map) {
    drawnItems.clearLayers();
    map.eachLayer(layer => {
      if (layer instanceof L.LeafletGeotiff) {
        map.removeLayer(layer);
      }
    });

  },



};

// View
const View = {
  visualizeGeotiff(geotiffPath, map, min, max,product) {
  if(product="lst"){
    L.leafletGeotiff(geotiffPath, {
      band: 0,
      name: "geotiff",
      opacity: 0.2,
      renderer: L.LeafletGeotiff.plotty({
        displayMin: max,
        displayMax: min,
        colorScale: 'autumn',
        clampLow: false,
        clampHigh: true,
        opacity: 0.2,
      }),
    }).addTo(map);

  }else{
    L.leafletGeotiff(geotiffPath, {
      band: 0,
      name: "geotiff",
      opacity: 0.2,
      renderer: L.LeafletGeotiff.plotty({
        displayMin: 0,
        displayMax: 1,
        colorScale: 'yignbu',
        clampLow: false,
        clampHigh: true,
        opacity: 0.2,
      }),
    }).addTo(map);
  }
    
  
    if (this.legend) {
      this.legend.remove();
    }
    this.legend = Model.generateLegend(min, max,product);
    this.legend.addTo(map);
    return this.legend;
  },
  
  openModal() {
    // Show the alert modal
    $("#myModal").modal("show");
  },

  closeModal() {
    $("#myModal").modal("hide");
    $("#chartModal").modal("hide");
  },
  openChartModal() {
    $("#chartModal").modal("show");
  },

  closeChartModal() {
    $("#chartModal").modal("hide");
  },
  getSelectedProduct() {
    return $("#productSelect").val();
  },
  getSelectedStartDate() {
    return $("#startDatePicker").val();
  },
  getSelectedEndDate() {
    return $("#endDatePicker").val();
  },

  bindFileButtonEvent(handler) {
    $("#fileButton").on("click", handler);
  },

  bindCloseButtonEvent(handler) {
    $("#closeButton, .close").on("click", handler);
  },

  bindSelectButton(handler) {
    $("#selectFileBtn").on("click", handler);
  },
  bindChartButton(handler) {
    $("#openChart").on("click", handler);
  },
  desplayChart(result, varaible) {
    // Extract data and labels from the response
    const data_ = result.map(item => item[0]);
    const labels = result.map(item => item[1]);
    // Create the chart
    var chartData = [
      {
        x: labels,
        y: data_,
        type: "scatter",
        mode: "lines+markers",
        marker: {
          color: "blue",
        },
        line: {
          color: "blue",
        },
      },
    ];
    var layout = {
      autosize: true,
      title: "Mean of " + varaible.toUpperCase() + " by time",
      xaxis: {
        title: "Date",
      },
      yaxis: {
        title: varaible,
      },
    };

    Plotly.newPlot("chart", chartData, layout);
    document.getElementById("chart").style.display = "block";
  },
  getSelectedHours() {
    return $("#hourSelect").val();
  },
  toaserError(msg) {
    $('.toast-body').text(msg);

    // Show the toast
    $('#errorToast').toast('show');
  },

  export_csv(result) {
    const currentDate = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19); // Get the current date and time in yyyy-mm-dd hh-mm-ss format
    const filename = `result_${currentDate}.csv`;
  
    const csvContent = "data:text/csv;charset=utf-8," + result.map(item => item.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link); // Required for Firefox
    link.click();
  }
  ,
  bindExportButtonEvent(handler) {
    $("#export").on("click", handler);
  },

};

// Controller
// Controller
const Controller = {

  init() {
    // declar global Varaibles 
    var selectedProduct;
    var selectedStartDate;
    var selectedEndDate;
    var hours_selected;
    var resault;
    var legend;

    // bind Actions 
    View.bindFileButtonEvent(() => {

      View.openModal();

    });
    // bind Actions 
    View.bindExportButtonEvent(() => {

        View.export_csv(resault)
    });

    View.bindChartButton(() => {
      console.log(selectedProduct == null, resault == null)
      if (selectedProduct == null || resault == null) {
        View.toaserError("Please select the Product First")
        return;
      }
      View.desplayChart(resault, selectedProduct);
      View.openChartModal();
    });




    View.bindCloseButtonEvent(() => {

      View.closeModal();
    });



    // create the map
    const map = L.map("map", {
      minZoom: 0,
      maxZoom: 20,
    }).setView([0, 0], 3);
    // set Satillites Tile Layer
    L.tileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoic2FhZDA2IiwiYSI6ImNrdG90OGNvaDBmdngydm55djcwcjN3YmIifQ.Yo8P8RxM363E0KEf39cmtA",
      {
        attribution:
          'Map data &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 22,
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          "pk.eyJ1Ijoic2FhZDA2IiwiYSI6ImNrdG90OGNvaDBmdngydm55djcwcjN3YmIifQ.Yo8P8RxM363E0KEf39cmtA",
      }
    ).addTo(map);

    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    // add Drow Options
    var drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
      },
      draw: {
        polygon: true,
        polyline: false,
        rectangle: true,
        circle: false,
        marker: true,
        circlemarker: false,
      },
    });
    map.addControl(drawControl);

    map.on("draw:created", function (e) {

      var layer = e.layer;
      drawnItems.addLayer(layer);
      const shape = e.layerType;

      if (selectedProduct == null || selectedEndDate == null || selectedEndDate == null) {
        View.toaserError("Please select The product Fisrt !")
        return;
      }


      if (shape === "marker") {
        // Retrieve the coordinates of the selected point
        var latLng = layer.getLatLng();
        var lat = latLng.lat;
        var lng = latLng.lng;
        // Update the popup content with data from the backend
        Model.selectValueOfPoint(layer, lat, lng, selectedProduct, selectedStartDate, selectedEndDate, hours_selected).then((response) => {


          if (response.error) {
            View.toaserError("No Data Found For this Date / time")
            return;
          }
          resault = response.data

        })
          .catch((error) => {
            console.log("Error:", error);
          });

      } else if (shape === "polygon") {
        var polygon = layer.getLatLngs();
        Model.selectValueOfPolygon(layer, polygon[0], selectedProduct, selectedStartDate, selectedEndDate, hours_selected).then((response) => {
          if (response.error) {
            View.toaserError("No Data Found For this Date / time")
            return;
          }
          resault = response.data
          legend = View.visualizeGeotiff(response.path, map, response.min, response.max ,selectedProduct)
        })
          .catch((error) => {
            console.log("Error:", error);
          });

      } else if (shape === "rectangle") {
        const bounds = layer.getBounds();
        // Create a Polygon from the rectangle bounds
        const polygon = L.polygon([
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast(),
        ]);

        // Access the coordinates of the polygon
        const coordinates = polygon.getLatLngs();
        Model.selectValueOfPolygon(layer, coordinates[0], selectedProduct, selectedStartDate, selectedEndDate, hours_selected).then((response) => {
          if (response.error) {
            View.toaserError("No Data Found For this Date / time")
            return;
          }
          resault = response.data
          View.visualizeGeotiff(response.path, map, response.min, response.max,selectedProduct)
          // ... Other processing with the data
        })
          .catch((error) => {
            // Handle errors
            console.log("Error:", error);
          });

        // Log the coordinates
      }
    });

    View.bindSelectButton(() => {
      Model.clearMap(drawnItems, map);
      selectedProduct = View.getSelectedProduct();
      selectedStartDate = View.getSelectedStartDate();
      selectedEndDate = View.getSelectedEndDate();
      hours_selected = View.getSelectedHours()
      if (selectedProduct == "lst" && hours_selected.length === 0) {
        View.toaserError("Please select at least one hour.")
        return;
      }
      View.closeModal()
    });

  },
};

// Initialize the controller
Controller.init();
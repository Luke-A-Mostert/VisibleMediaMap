var map;
var markers = [];
var keyContent;
var popupOpen = false;
var panelData = {};
var selectedPanel = null;

// Function to hide overlay
function hideOverlay() {
  var overlay = document.querySelector(".overlay");
  if (overlay) {
    overlay.remove();
  }
}

function closePopup() {
  var popup = document.querySelector(".custom-popup");

  if (popup) {
    popupOpen = false;

    popup.remove();
  }
  hideOverlay();
}

async function initMap() {
  // Initialize the map
  /////////////////////////////////////////////////////////////////////////////////////////
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10, // Adjust the initial zoom level as needed
    center: { lat: 41.450864, lng: -87.52645 }, // Center the map on Chicago
  });
  /////////////////////////////////////////////////////////////////////////////////////////

  //marker clusters
  /////////////////////////////////////////////////////////////////////////////////////////

  var clusterer = new MarkerClusterer(map, [], {
    minimumClusterSize: 2,
    gridSize: 10,
    averageCenter: true,
    maxZoom: 11,
    styles: [
      {
        url: "Data/cluster.png", // URL of the cluster icon image
        textColor: "white",
        width: 20, // Width of the cluster icon (in pixels)
        height: 20, // Height of the cluster icon (in pixels)
        anchor: [20, 8], // getting the number in the center
      },
    ],
  });

  //making it so that the cluster behaves differently the more zooomed, so that it looks nicer at a certain zoom
  google.maps.event.addListener(map, "zoom_changed", function () {
    var zoomLevel = map.getZoom();
    var gridSize = 20; // Default grid size
    if (zoomLevel < 7) {
      gridSize = 150; // Larger grid size for more zoomed out levels
    }
    clusterer.setGridSize(gridSize);
  });

  // Add a click event listener for the clusters
  clusterer.addListener("clusterclick", function (cluster) {
    var map = cluster.getMarkerClusterer().getMap();
    var currentZoom = map.getZoom();
    var maxZoom = cluster.getMarkerClusterer().getMaxZoom();
    var bounds = cluster.getBounds();

    map.fitBounds(bounds);
    // This delay ensures the fitBounds has taken effect before adjusting the zoom level
    google.maps.event.addListenerOnce(map, "idle", function () {
      if (currentZoom >= maxZoom || map.getZoom() > maxZoom) {
        map.setZoom(12);
      } else {
        map.setZoom(12); // Adjust the increment as needed
      }
    });
  });

  /////////////////////////////////////////////////////////////////////////////////////////

  // Create a custom popup
  /////////////////////////////////////////////////////////////////////////////////////////
  function createCustomPopup(content) {
    var popupDiv = document.createElement("div");
    popupDiv.classList.add("custom-popup");
    popupDiv.innerHTML = content;
    map.getDiv().appendChild(popupDiv);
    return popupDiv;
  }

  // Function to show overlay
  function showOverlay() {
    var overlay = document.createElement("div");
    overlay.classList.add("overlay");
    document.body.appendChild(overlay);
  }

  // Function to create and show the popup
  function showPopup(info, Lat, Long) {
    // Show overlay to block interactions with the map
    popupOpen = true;
    showOverlay();

    // Create and show the popup
    var popup = createCustomPopup(info);
    // Position the popup at the center of the map
    var popupOffsetX = popup.offsetWidth / 2;
    var popupOffsetY = popup.offsetHeight / 2;
    var center = map.getCenter();
    var centerPixel = map.getProjection().fromLatLngToPoint(center);
    var newPixelX = centerPixel.x - popupOffsetX;
    var newPixelY = centerPixel.y - popupOffsetY;
    var newLatLng = map
      .getProjection()
      .fromPointToLatLng(new google.maps.Point(newPixelX, newPixelY));
    // Set the position of the popup
    popup.style.left = map.getDiv().offsetWidth / 3 + "px";
    popup.style.top = map.getDiv().offsetHeight / 9 + "px";

    var miniMap = new google.maps.Map(document.getElementById("miniMap"), {
      center: { lat: parseFloat(Lat), lng: parseFloat(Long) },
      zoom: 15,
      disableDefaultUI: true,
    });

    var miniMarker = new google.maps.Marker({
      position: { lat: parseFloat(Lat), lng: parseFloat(Long) },
      map: miniMap,
    });
    console.log("Mini map should be visible now."); // Debugging line
  }

  /////////////////////////////////////////////////////////////////////////////////////////

  //custom marker
  /////////////////////////////////////////////////////////////////////////////////////////
  // Array to store marker objects
  markers = [];

  //custom marker image
  const markerIcon = "Data/markertest.png";

  // Function to add a marker to the map
  function addMarker(
    keyContent,
    position,
    name,
    contentString,
    Lat,
    Long,
    Traffic,
    Loc,
    BoardSize,
    Img,
    Facing,
    Pricing,
    Illuminated,
    Description
  ) {
    var marker = new google.maps.Marker({
      map: map,
      position: position,
      label: {
        text: name.toString(), // Display ID as the label on the marker
        className: "custom-marker-label",
        color: "white",
      },
      icon: {
        url: markerIcon,
        scaledSize: new google.maps.Size(20, 30),
      },
      ID: name,
      Lat: Lat,
      Long: Long,
      Traffic: Traffic,
      Loc: Loc,
      BoardSize: BoardSize,
      Img: Img,
      Facing: Facing,
      Pricing: Pricing,
      Illuminated: Illuminated,
      Description: Description,
    });

    //marker.addListener("click", function () {
    //  showPopup(contentString, Lat, Long);
    //});

    marker.addListener("click", () => {
      openPanelSelector(name);
    });

    clusterer.addMarker(marker);
    markers.push(marker); // Store the marker in the markers array
    createKey(name, Loc);
  }
  /////////////////////////////////////////////////////////////////////////////////////////

  // Fetch billboard data from CSV file
  /////////////////////////////////////////////////////////////////////////////////////////
  fetch("Data/boards.csv") // Update with your CSV file path
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((csv) => {
      const lines = csv.split("\n").slice(1); // Skip header line
      lines.forEach((line, index) => {
        if (line.trim().length > 0) {
          let values = [];
          let insideQuotes = false;
          let currentValue = "";

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === "," && !insideQuotes) {
              values.push(currentValue.trim());
              currentValue = "";
            } else {
              currentValue += char;
            }
          }
          // Push the last value
          values.push(currentValue.trim());

          // If the number of values is correct
          if (values.length === 11) {
            let [
              ID,
              Lat,
              Long,
              Traffic,
              Loc,
              BoardSize,
              Img,
              Facing,
              Pricing,
              Illuminated,
              Description,
            ] = values;
            const boardId = ID.slice(0, -1);
            const panelId = ID.slice(-1);

            if (!panelData[boardId]) {
              panelData[boardId] = { Lat, Long, panels: {} };
            }
            panelData[boardId].panels[panelId] = {
              ID,
              Lat,
              Long,
              Traffic,
              Loc,
              BoardSize,
              Img,
              Facing,
              Pricing,
              Illuminated,
              Description,
            };

            if (!panelData[boardId]) panelData[boardId] = {};
            panelData[boardId][panelId] = {
              ID,
              Lat,
              Long,
              Traffic,
              Loc,
              BoardSize,
              Img,
              Facing,
              Pricing,
              Illuminated,
              Description,
            };
          } else {
            console.error(
              `Error parsing CSV line ${index + 1}: Incorrect number of values`
            );
          }
        }
      });

      Object.keys(panelData).forEach((boardId) => {
        const board = panelData[boardId];
        const firstPanel =
          board.panels["N"] ||
          board.panels["S"] ||
          board.panels["W"] ||
          board.panels["E"];
        const contentString = `
          <button class="close-button" onclick="closePopup()">X</button>
          <div class="popup-content">
            <h1>${firstPanel.Loc}</h1>
            <div class="images-container">
              <div class="image-item">
                <img src="Data/${firstPanel.Img}" alt="Billboard Image">
                <p><strong>${firstPanel.Facing} Face</strong></p>
              </div>
              <div id="miniMap"></div>
            </div>
            <div class="description-box">
              <p>${firstPanel.Description}</p>
            </div>
            <div class="grid-container">
              <div class="grid-item"><strong>Board Number</strong><p>${firstPanel.ID}</p></div>
              <div class="grid-item"><strong>Traffic</strong><p>${firstPanel.Traffic}</p></div>
              <div class="grid-item"><strong>Board Size</strong><p>${firstPanel.BoardSize}</p></div>
              <div class="grid-item"><strong>Lat/Long</strong><p><a href="https://www.google.com/maps?q=${firstPanel.Lat},${firstPanel.Long}" target="_blank">${firstPanel.Lat}, ${firstPanel.Long}</a></p></div>
              <div class="grid-item"><strong>Pricing</strong><p>${firstPanel.Pricing}</p></div>
              <div class="grid-item"><strong>Illuminated</strong><p>${firstPanel.Illuminated}</p></div>
            </div>
          </div>
        `;
        addMarker(
          keyContent,
          { lat: parseFloat(board.Lat), lng: parseFloat(board.Long) },
          boardId,
          contentString,
          board.Lat,
          board.Long,
          firstPanel.Traffic,
          firstPanel.Loc,
          firstPanel.BoardSize,
          firstPanel.Img,
          firstPanel.Facing,
          firstPanel.Pricing,
          firstPanel.Illuminated,
          firstPanel.Description
        );
      });
    })
    .catch((error) => {
      console.error("Error fetching the CSV file:", error);
    });

  /////////////////////////////////////////////////////////////////////////////////////////

  function openPanelSelector(markerId) {
    const panelSelector = document.getElementById("panel-selector");
    const panelDropdown = document.getElementById("panelDropdown");

    if (panelDropdown) {
      panelDropdown.innerHTML = "";

      const board = panelData[markerId];
      if (board && board.panels) {
        Object.keys(board.panels).forEach((panelId) => {
          const panel = board.panels[panelId];
          const option = document.createElement("option");
          option.value = panel.ID;
          option.text = `${panel.Facing} - ${panel.Description}`;
          panelDropdown.appendChild(option);
        });
      } else {
        console.error(`No panels found for markerId: ${markerId}`);
      }

      if (panelSelector) {
        panelSelector.classList.remove("hidden");
      } else {
        console.error("Panel selector element not found.");
      }

      const viewPanelBtn = document.getElementById("viewPanelBtn");
      if (viewPanelBtn) {
        viewPanelBtn.onclick = () => {
          const selectedPanelId = panelDropdown.value;
          showPanel(selectedPanelId);
        };
      } else {
        console.error("View Panel button not found.");
      }
    } else {
      console.error("Panel dropdown element not found.");
    }
  }

  function showPanel(panelId) {
    let panelFound = false; // Flag to check if panel is found

    for (const boardId in panelData) {
      const board = panelData[boardId];
      if (board && board.panels) {
        for (const panelIdKey in board.panels) {
          const panel = board.panels[panelIdKey];
          if (panel.ID === panelId) {
            const contentString = `
              <button class="close-button" onclick="closePopup()">X</button>
              <div class="popup-content">
                <h1>${panel.Loc}</h1>
                <div class="images-container">
                  <div class="image-item">
                    <img src="Data/${panel.Img}" alt="Billboard Image Front">
                    <p><strong>${panel.Facing} Face</strong></p>
                  </div>
                  <div id="miniMap"></div>
                </div>
                <div class="description-box">
                  <p>${panel.Description}</p>
                </div>
                <div class="grid-container">
                  <div class="grid-item"><strong>Board Number</strong><p>${panel.ID}</p></div>
                  <div class="grid-item"><strong>Traffic</strong><p>${panel.Traffic}</p></div>
                  <div class="grid-item"><strong>Board Size</strong><p>${panel.BoardSize}</p></div>
                  <div class="grid-item"><strong>Lat/Long</strong><p><a href="https://www.google.com/maps?q=${panel.Lat},${panel.Long}" target="_blank">${panel.Lat}, ${panel.Long}</a></p></div>
                  <div class="grid-item"><strong>Pricing</strong><p>${panel.Pricing}</p></div>
                  <div class="grid-item"><strong>Illuminated</strong><p>${panel.Illuminated}</p></div>
                </div>
              </div>
            `;
            // Display contentString in your popup
            showPopup(contentString, panel.Lat, panel.Long);
            panelFound = true; // Panel was found
            break; // Exit the loop once the panel is found
          }
        }
        if (panelFound) break; // Exit outer loop if panel is found
      }
    }

    if (!panelFound) {
      console.error(`Panel with ID ${panelId} not found.`);
    }
  }

  function createKey(name, location) {
    var mapKey = document.getElementById("mapKeyPopup");
    if (mapKey) {
      var keyItem = document.createElement("div");
      keyItem.className = "map-key-item";
      keyItem.innerHTML = `${name}: ${location}`;
      keyItem.onclick = function () {
        openKeyPopup(name);
      };
      mapKey.appendChild(keyItem);
    } else {
      console.error("map-key element not found.");
    }
  }

  function openKeyPopup(markerId) {
    console.log(markers);
    var marker = markers.find(function (m) {
      return m.ID === String(markerId);
    });
    if (marker && !popupOpen) {
      popupOpen = true;
      var contentString = `
                            <button class="close-button" onclick="closePopup()">X</button>
                            <div class="popup-content">
                                <h1>${marker.Loc}</h1>
                                <div class = "images-container">
                                    <div class = "image-item">
                                    <img src="Data/${
                                      marker.Img
                                    }" alt="Billboard Image Front">
                                    <p><strong>${marker.Facing} Face</p>
                                    </div>
                                    <div id="miniMap"></div>
                                </div>
                                <div class="description-box">
                                    <p>${marker.Description}</p>
                                </div>
                                <div class="grid-container">
                                    <div class="grid-item">
                                        <p class="title"><strong>Board Number</strong></p>
                                        <p>${marker.ID}</p>
                                    </div>
                                    <div class="grid-item">
                                        <p class="title"><strong>Traffic</strong></p>
                                        <p> ${marker.Traffic}</p>
                                    </div>
                                    <div class="grid-item">
                                        <p class="title"><strong>Board Size</strong></p>
                                        <p> ${marker.BoardSize}</p>
                                    </div>
                                    <div class="grid-item">
                                        <p class="title"><strong>Lat/Long</strong></p>
                                        <p> <a href="https://www.google.com/maps?q=${
                                          marker.Lat
                                        },${marker.Long}" target="_blank">${
        marker.Lat + ", " + marker.Long
      }</a></p>
                                    </div>
                                    <div class="grid-item">
                                        <p class="title"><strong>Pricing</strong></p>
                                        <p>${marker.Pricing}</p>
                                    </div>
                                    <div class="grid-item">
                                        <p class="title"><strong>Illuminated</strong></p>
                                        <p> ${marker.Illuminated}</p>
                                    </div>
                                    
                                </div>
                                
                            </div>
                    `;

      var overlay = document.createElement("div");
      overlay.classList.add("overlay");
      document.body.appendChild(overlay);

      var popupDiv = document.createElement("div");
      popupDiv.classList.add("custom-popup");
      popupDiv.innerHTML = contentString;
      map.getDiv().appendChild(popupDiv);
      // Create and show the popup
      // Position the popup at the center of the map
      var popupOffsetX = popupDiv.offsetWidth / 2;
      var popupOffsetY = popupDiv.offsetHeight / 2;
      var center = map.getCenter();
      var centerPixel = map.getProjection().fromLatLngToPoint(center);
      var newPixelX = centerPixel.x - popupOffsetX;
      var newPixelY = centerPixel.y - popupOffsetY;
      var newLatLng = map
        .getProjection()
        .fromPointToLatLng(new google.maps.Point(newPixelX, newPixelY));
      // Set the position of the popup
      popupDiv.style.left = map.getDiv().offsetWidth / 3 + "px";
      popupDiv.style.top = map.getDiv().offsetHeight / 9 + "px";

      var miniMap = new google.maps.Map(document.getElementById("miniMap"), {
        center: { lat: parseFloat(marker.Lat), lng: parseFloat(marker.Long) },
        zoom: 15,
        disableDefaultUI: true,
      });

      new google.maps.Marker({
        position: { lat: parseFloat(marker.Lat), lng: parseFloat(marker.Long) },
        map: miniMap,
      });
      console.log("Mini map should be visible now."); // Debugging line
    }
  }
}
window.onload = initMap;

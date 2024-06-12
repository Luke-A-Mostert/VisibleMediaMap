
    // Function to hide overlay
    function hideOverlay() 
    {
        var overlay = document.querySelector('.overlay');
        if (overlay) {
            overlay.remove();
        }
    }

function closePopup() {
    console.log("Close button clicked"); // For debugging
    var popup = document.querySelector('.custom-popup');
    console.log("Popup element:", popup); // For debugging
    if (popup) {
        popup.remove();
    }
    hideOverlay();
}

async function initMap() {
    
    
    // Initialize the map
    /////////////////////////////////////////////////////////////////////////////////////////
    var map = new google.maps.Map(document.getElementById('map'), 
    {
        zoom: 9, // Adjust the initial zoom level as needed
        center: {lat: 41.450864, lng: -87.526450} // Center the map on Chicago
    });
    /////////////////////////////////////////////////////////////////////////////////////////



    //marker clusters
    /////////////////////////////////////////////////////////////////////////////////////////

    var clusterer = new MarkerClusterer(map, [],{
        minimumClusterSize: 2,
        gridSize: 20,
        averageCenter: true,
        styles: [{
            url: 'Data/cluster.png', // URL of the cluster icon image
            textColor: 'white',
            width: 20, // Width of the cluster icon (in pixels)
            height: 20, // Height of the cluster icon (in pixels)
            anchor: [20, 8] // getting the number in the center
        }]
    });

    //making it so that the cluster behaves differently the more zooomed, so that it looks nicer at a certain zoom
    google.maps.event.addListener(map, 'zoom_changed', function() {
        var zoomLevel = map.getZoom();
        var gridSize = 20; // Default grid size
        if (zoomLevel < 7) {
            gridSize = 150; // Larger grid size for more zoomed out levels
        }
        clusterer.setGridSize(gridSize);
    });
    /////////////////////////////////////////////////////////////////////////////////////////




    // Create a custom popup
    /////////////////////////////////////////////////////////////////////////////////////////
    function createCustomPopup(content) 
    {
        var popupDiv = document.createElement('div');
        popupDiv.classList.add('custom-popup');
        popupDiv.innerHTML = content;
        map.getDiv().appendChild(popupDiv);
        return popupDiv;
    }
    
    // Function to show overlay
    function showOverlay() 
    {
        var overlay = document.createElement('div');
        overlay.classList.add('overlay');
        document.body.appendChild(overlay);
    }
    

    
    // Function to create and show the popup
    function showPopup(info) {
        // Show overlay to block interactions with the map
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
        var newLatLng = map.getProjection().fromPointToLatLng(new google.maps.Point(newPixelX, newPixelY));
         // Set the position of the popup
        popup.style.left = (map.getDiv().offsetWidth/3) + 'px';
        popup.style.top = (map.getDiv().offsetHeight / 7) + 'px';
    }
    

    /////////////////////////////////////////////////////////////////////////////////////////

    //custom marker
    /////////////////////////////////////////////////////////////////////////////////////////
    // Array to store marker objects
    var markers = [];

    //custom marker image
    const markerIcon = "Data/marker.png"

    // Function to add a marker to the map
    function addMarker(location, name, contentString) 
    {
        var marker = new google.maps.Marker
        ({
            map: map,
            position: location,
            icon: {
               url: markerIcon,
               scaledSize: new google.maps.Size(70,63)
            },
            name: name
        });

        marker.addListener('click', function() {

            showPopup(contentString);

        });

        
        clusterer.addMarker(marker);
        markers.push(marker); // Store the marker in the markers array
    }

    /////////////////////////////////////////////////////////////////////////////////////////



    // Fetch billboard data from CSV file
    /////////////////////////////////////////////////////////////////////////////////////////
    fetch('Data/boards.csv') // Update with your CSV file path
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(csv => {
        const lines = csv.split('\n').slice(1); // Skip header line
        lines.forEach((line, index) => {
            if (line.trim().length > 0) {
                let values = [];
                let insideQuotes = false;
                let currentValue = '';

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        values.push(currentValue.trim());
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }
                // Push the last value
                values.push(currentValue.trim());

                // If the number of values is correct
                if (values.length === 12) {
                    const [ID, Lat, Long, Traffic, Location, BoardSize, ImageFront, ImageBack, FacingFront, FacingBack, Availability, Pricing] = values;
                    if (Lat && Long) {
                        var contentString = `
                        <div class="custom-popup">
                            <button class="close-button" onclick="closePopup()">X</button>
                            <div class="popup-content">
                                <h1>${Location}</h1>
                                <div class = "images-container">
                                    <div class = "image-item">
                                    <img src="Data/${ImageFront}" alt="Billboard Image Front">
                                    <p><strong>${FacingFront} Facing</p>
                                    </div>
                                    <div class = "image-item">
                                    <img src="Data/${ImageBack}" alt="Billboard Image Back">
                                    <p><strong>${FacingBack} Facing</p>
                                    </div>
                                </div>
                                <div class="info">
                                    <p><strong>Board Number:</strong> ${ID}</p>
                                    <p><strong>Traffic:</strong> ${Traffic}</p>
                                    <p><strong>Board Size:</strong> ${BoardSize}</p>
                                    <p><strong>Lat/Long:</strong> <a href="https://www.google.com/maps?q=${Lat},${Long}" target="_blank">${Lat + ", " + Long}</a></p>
                                    <p><strong>Availability:</strong> ${Availability}</p>
                                    <p><strong>Pricing:</strong> ${Pricing}</p>
                                    <!-- Add more information here as needed -->
                                </div>
                            </div>
                        </div>
                    `;
                        addMarker({ lat: parseFloat(Lat), lng: parseFloat(Long) }, ID, contentString);
                    }
                } else {
                    console.error(`Error parsing CSV line ${index + 1}: Incorrect number of values`);
                }
            }
        });
    })
    .catch(error => {
        console.error('Error fetching the CSV file:', error);
    });
    /////////////////////////////////////////////////////////////////////////////////////////
}
window.onload = initMap;
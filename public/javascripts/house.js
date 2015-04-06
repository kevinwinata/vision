var map, mapOptions, featureOpts,
	mapContainer = document.getElementById('map-canvas'),
	copyContainer = document.getElementById('copy-canvas'),
	height = mapContainer.clientHeight, 
	width = mapContainer.clientWidth,
	ctx, imgd, 
	origimgd = [],
	foreground = [255,0,255,100],
	background = [0,0,0,0],
	pixelSamples = [];
	zeros = new Array(height);

function initialize() {
	for (var i = 0; i < height; i++) zeros[i] = 0;

	mapOptions = {
		zoom: 18,
		center: new google.maps.LatLng(-6.8734451, 107.5682454),
		mapTypeControl: false,
		zoomControl: false,
		streetViewControl: false,
		panControl: false,
		mapTypeId: google.maps.MapTypeId.SATELLITE
	};

	featureOpts = [
		{
			featureType: "all",
			elementType: "labels",
			stylers: [
				{ visibility: "off" }
			]
		}
	];

	map = new google.maps.Map(mapContainer,	mapOptions);
	map.mapTypes.set(google.maps.MapTypeId.SATELLITE, new google.maps.StyledMapType(featureOpts, {}));

	google.maps.event.addListener(map,'zoom_changed', addEmptyNode);
	google.maps.event.addListener(map,'center_changed', addEmptyNode);
	google.maps.event.addListener(map,'idle', addCanvasOverlay);
	google.maps.event.addListener(map,'click', function(e) {
		var point = e.pixel,
			pixel = getPixel(origimgd,point.x,point.y);
		pixelSamples.push(pixel);
		alert(pixelSamples);
		colorMap(imgd,20,2);
		ctx.putImageData(imgd, 0, 0);
	});
}

google.maps.event.addDomListener(window, 'load', initialize);

function addEmptyNode() {
	copyContainer.replaceChild(document.createTextNode(""), 
			copyContainer.childNodes[0]);
}

function addCanvasOverlay() {
	var transform = $(".gm-style>div:first>div").css("transform"),
		comp = transform.split(","),	//split up the transform matrix
		mapleft = parseFloat(comp[4]),	//get left value
		maptop = parseFloat(comp[5]);	//get top value
	$(".gm-style>div:first>div").css({	//get the map container. not sure if stable
		"transform":"none",
		"left":mapleft,
		"top":maptop,
	});

	html2canvas(mapContainer, {
		useCORS: true,
		onrendered: function(canvas) {
			ctx = canvas.getContext('2d');
			imgd = ctx.getImageData(0, 0, width, height);
			var i = imgd.data.length;
			while (i--) 
				origimgd[i] = imgd.data[i];

			if(pixelSamples.length) {
				colorMap(imgd,20,2);
				ctx.putImageData(imgd, 0, 0);
			}
			else {
				alert("Select a pixel first.");
			}

			copyContainer.replaceChild(canvas, copyContainer.childNodes[0]);

			$(".gm-style>div:first>div").css({
				left:0,
				top:0,
				"transform":transform
			});
		}
	});

}

function colorMap(image,maxDistance,mode) {
	var stack = [],
		labels = [],
		curlab = 1;
	for (var i = 0; i < width; i++) labels[i] = zeros.slice();

	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(countDist(image.data,i,j,pixelSamples,mode) <= maxDistance && 
				labels[i][j] == 0) 
			{
				stack.push([i,j]);
				while(stack.length) {
					var p = stack.pop(),
						px = getPixel(image.data,p[0],p[1]);
					labels[p[0]][p[1]] = curlab;
					if( p[0]-1 >= 0 && labels[p[0]-1] && 
						countDist(image.data,p[0]-1,p[1],pixelSamples,mode) <= maxDistance && 
						labels[p[0]-1][p[1]] == 0) 
						stack.push([p[0]-1,p[1]]);
					if( p[0]+1 <= width && labels[p[0]+1] && 
						countDist(image.data,p[0]+1,p[1],pixelSamples,mode) <= maxDistance && 
						labels[p[0]+1][p[1]] == 0) 
						stack.push([p[0]+1,p[1]]);
					if( p[1]-1 >= 0 && labels[p[0]] && 
						countDist(image.data,p[0],p[1]-1,pixelSamples,mode) <= maxDistance && 
						labels[p[0]][p[1]-1] == 0) 
						stack.push([p[0],p[1]-1]);
					if( p[1]+1 <= height && labels[p[0]] && 
						countDist(image.data,p[0],p[1]+1,pixelSamples,mode) <= maxDistance && 
						labels[p[0]][p[1]+1] == 0) 
						stack.push([p[0],p[1]+1]);
				}
				curlab++;
			}
		}
	}
	alert(curlab);


	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(labels[i][j] != 0) {
				setPixel(image.data,i,j,[	(labels[i][j]*50%255),
											(labels[i][j]*100%255),
											(labels[i][j]*150%255),
											200]);
			}
		}
	}
}

function getPixel(data,x,y) {
	var i = (width * y + x) * 4;
	return [
		data[i  ],
		data[i+1],
		data[i+2],
		data[i+3]
	];
}

function eqPixel(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	return (data[i  ] == pixel[0] &&
			data[i+1] == pixel[1] &&
			data[i+2] == pixel[2] &&
			data[i+3] == pixel[3]);
}

function isForeground(data,x,y) {
	var i = (width * y + x) * 4;
	return (data[i  ] == 255 &&
			data[i+1] == 0 &&
			data[i+2] == 255);
}

function isBackground(data,x,y) {
	var i = (width * y + x) * 4;
	return (data[i  ] == 0 &&
			data[i+1] == 0 &&
			data[i+2] == 0);
}

function setPixel(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	data[i  ] = pixel[0];
	data[i+1] = pixel[1];
	data[i+2] = pixel[2];
	data[i+3] = pixel[3];
}

function euclideanDist(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	return Math.sqrt(
				Math.pow(data[i  ] - pixel[0]) + 
				Math.pow(data[i+1] - pixel[1]) + 
				Math.pow(data[i+2] - pixel[2]) 
			);
}

function cityblockDist(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	return  Math.abs(data[i  ] - pixel[0]) + 
			Math.abs(data[i+1] - pixel[1]) + 
			Math.abs(data[i+2] - pixel[2]);
}

function chessboardDist(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	return Math.max(
				Math.abs(data[i  ] - pixel[0]),
				Math.abs(data[i+1] - pixel[1]),
				Math.abs(data[i+2] - pixel[2]) 
			);
}

function countDist(data,x,y,pixels,mode) {
	var distArr = [];
	switch(mode) {
		case 0: for(var i = 0; i < pixels.length; i++)
					distArr[i] = euclideanDist(data,x,y,pixels[i]);
				break;
		case 1: for(var i = 0; i < pixels.length; i++)
					distArr[i] = cityblockDist(data,x,y,pixels[i]);
				break;
		case 2: for(var i = 0; i < pixels.length; i++)
					distArr[i] = chessboardDist(data,x,y,pixels[i]);
				break;
	}
	return Math.min.apply(null,distArr);
}
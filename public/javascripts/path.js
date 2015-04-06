var map, mapOptions, featureOpts,
	mapContainer = document.getElementById('map-canvas'),
	copyContainer = document.getElementById('copy-canvas'),
	height = mapContainer.clientHeight, 
	width = mapContainer.clientWidth,
	ctx, imgd,
	foreground = [255,0,255,255],
	background = [0,0,0,0],
	sourceNode, targetNode,
	MY_MAPTYPE_ID = 'custom_style';

function initialize() {
	mapOptions = {
		zoom: 13,
		center: new google.maps.LatLng(-6.915410, 107.613439),
		mapTypeControl: false,
		zoomControl: false,
		streetViewControl: false,
		panControl: false,
		mapTypeControlOptions: {
			mapTypeIds: [google.maps.MapTypeId.ROADMAP, MY_MAPTYPE_ID]
		},
		mapTypeId: MY_MAPTYPE_ID
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
	map.mapTypes.set(MY_MAPTYPE_ID, new google.maps.StyledMapType(featureOpts, {}));

	google.maps.event.addListener(map,'zoom_changed', addEmptyNode);
	google.maps.event.addListener(map,'center_changed', addEmptyNode);
	google.maps.event.addListener(map,'click', function(e) {
		var point = latLngToPoint(e.latLng);
			approx = approximate(imgd.data,point.x,point.y);

		if(approx) {
			var x = approx[0], y = approx[1];
			if (!sourceNode) {
				sourceNode = [x,y];
				alert("source = "+"("+x+","+y+")");
			}
			else {
				targetNode = [x,y];
				alert("target = "+"("+x+","+y+")");
				trace(imgd,x,y);
				ctx.putImageData(imgd, 0, 0);
				sourceNode = null;
			}
		}
		else {
			alert("("+point.x+","+point.y+") is not foreground. Please select another point.");
		}
	});
	google.maps.event.addListener(map,'idle', addCanvasOverlay);
}

google.maps.event.addDomListener(window, 'load', initialize);

function addEmptyNode() {
	copyContainer.replaceChild(document.createTextNode(""), 
			copyContainer.childNodes[0]);
	sourceNode = null;
}

function latLngToPoint(latLng) {
	overlay = new google.maps.OverlayView();
	overlay.draw = function() {};
	overlay.setMap(map);
	return overlay.getProjection().fromLatLngToDivPixel(latLng);
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
			ctx = canvas.getContext('2d'),
			imgd = ctx.getImageData(0, 0, width, height),

			threshold(imgd,[230,230,230,0],[256,256,256,255]);
			//dilate(imgd,min,max);
			thin(imgd);
			ctx.putImageData(imgd, 0, 0);

			copyContainer.replaceChild(canvas, copyContainer.childNodes[0]);

			$(".gm-style>div:first>div").css({
				left:0,
				top:0,
				"transform":transform
			});
		}
	});

}

function threshold(image,min,max) {
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(thresholdPixel(image.data,i,j,min,max)) {
				setPixel(image.data,i,j,foreground);
			}
				else {
				setPixel(image.data,i,j,background);
			}
		}
	}
}

function dilate(image) {
	var temp = [],
		i = image.data.length;
	while (i--) 
		temp[i] = image.data[i];
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isForeground(temp,i,j) || !superimpose(temp,i,j)) {
				setPixel(image.data,i,j,foreground);
			}
			else {
				setPixel(image.data,i,j,background);
			}
		}
	}
}

function trace(image) {
	var curNode = [],
		nextNode = [],
		path = [],
		stack = [],
		lastIdx;

	curNode = sourceNode;
	path.push(curNode);

	while(curNode[0] != targetNode[0] || curNode[1] != targetNode[1]) {
		//alert(curNode);
		var possibleDir = [];
		for(var i = 0; i < 8; i++) {
			var temp = moveDir(curNode[0],curNode[1],i);
			if (!(curNode[2] && opposite(i) == curNode[2]) && 
				isForeground(image.data,temp[0],temp[1])) 
			{
				possibleDir.push(temp);
			}
		}
		if(possibleDir.length) {
			if(possibleDir.length > 1) {
				lastIdx = path.length;
			}
			stack = stack.concat(possibleDir);
		}
		else {
			path = path.slice(0,lastIdx);
		}
		var n = stack.pop();
		if(n) {
			setPixel(image.data,n[0],n[1],[255,0,0,255]);
			curNode = n;
			path.push(n);
		}
	}

	path.forEach(function(n) {
		setPixel(image.data,n[0],n[1],[255,255,0,255]);
	});

}

function moveDir(x,y,dir) {
	// 7 0 1
	// 6   2
	// 5 4 3
	switch(dir) {
		case 0 : return [x,y-1,dir];
		case 1 : return [x+1,y-1,dir];
		case 2 : return [x+1,y,dir];
		case 3 : return [x+1,y+1,dir];
		case 4 : return [x,y+1,dir];
		case 5 : return [x-1,y+1,dir];
		case 6 : return [x-1,y,dir];
		case 7 : return [x-1,y-1,dir];
	}
}

function opposite(dir) {
	return (dir+4)%8;
}

function superimpose(data,x,y) {
	return (isBackground(data,x-1,y-1) && 
			isBackground(data,x-1,y) && 
			isBackground(data,x-1,y+1) && 
			isBackground(data,x,y-1) && 
			isBackground(data,x,y) && 
			isBackground(data,x,y+1) && 
			isBackground(data,x+1,y-1) && 
			isBackground(data,x+1,y) && 
			isBackground(data,x+1,y+1));
}

function approximate(data,x,y) {
	if(isForeground(data,x,y)) return [x,y];
	if(isForeground(data,x-1,y-1)) return [x-1,y-1];
	if(isForeground(data,x-1,y)) return [x-1,y];
	if(isForeground(data,x-1,y+1)) return [x-1,y+1];
	if(isForeground(data,x,y-1)) return [x,y-1];
	if(isForeground(data,x,y+1)) return [x,y+1];
	if(isForeground(data,x+1,y-1)) return [x+1,y-1];
	if(isForeground(data,x+1,y)) return [x+1,y];
	if(isForeground(data,x+1,y+1)) return [x+1,y+1];
	return null;
}

function thin(image) {
	var cArray, AP1, BP1,
		hasChange, aPoint = [], iFollower = 0;
	do {
		hasChange = false;
		var i;
		for(i = 1;i < width - 1; i++) {
			for(j = 1; j < height - 1; j++) {
				var cPoint = [i,j];
				setPArray(image,cPoint);
				setAB();
				if(isP1Black()) {
					if(checkStep1()) {
						aPoint.push(cPoint);
						hasChange = true;
					}
				}
			}
		}
		for(var i = 0 ; i < aPoint.length; i++) {
			removeWhite(image,aPoint[i]);
		}
		aPoint.length = 0;
		for (i = 1; i < width - 1; i++) {
			for(j = 1; j < height - 1; j++) {
				var cPoint = [i,j];
				setPArray(image,cPoint);
				setAB();
				
				if(isP1Black()) {
					if(checkStep2()) {
						aPoint.push(cPoint);
						hasChange = true;
					}
				}
			}
		}
		for(var i = 0 ; i < aPoint.length; i++) {
			removeWhite(image,aPoint[i]);
		}
		aPoint.length = 0;
	} while(hasChange);
}

function isP1Black() {
	return cArray[1] == 1;
}

function removeWhite(image,p) {
	setPixel(image.data,p[0],p[1],background);
}

function checkStep1() {
	return ( BP1 >= 2 && BP1 <= 6
			&& AP1 == 1
			&& (cArray[2] * cArray[4] * cArray[6]) == 0
			&& (cArray[4] * cArray[6] * cArray[8]) == 0);
}

function checkStep2() {
	return (BP1 >= 2 && BP1 <= 6
			&& AP1 == 1
			&& (cArray[2] * cArray[4] * cArray[8]) == 0
			&& (cArray[2] * cArray[6] * cArray[8]) == 0);
}

function setAB() {
	var sumA = 0;
	var sumB = 0;
	var i;
	for(i = 2; i < 9; i++) {
		 if (cArray[i] == 0 && cArray[i + 1] == 1) {
			sumA++;
		}
		if (cArray[i] == 1) {
			sumB++;
		}
	}
	if (cArray[9] == 0 && cArray[2] == 1) {
		sumA++;
	}
	if (cArray[9] == 1) {
		sumB++;
	}
	AP1 = sumA;
	BP1 = sumB;
}

function setPArray(image,p) {
	var marray = [];
	marray[1] = isBackground(image.data,p[0],p[1]) ? 0 : 1;
	marray[2] = isBackground(image.data,p[0],p[1]-1) ? 0 : 1;
	marray[3] = isBackground(image.data,p[0]+1,p[1]-1) ? 0 : 1;
	marray[4] = isBackground(image.data,p[0]+1,p[1]) ? 0 : 1;
	marray[5] = isBackground(image.data,p[0]+1,p[1]+1) ? 0 : 1;
	marray[6] = isBackground(image.data,p[0],p[1]+1) ? 0 : 1;
	marray[7] = isBackground(image.data,p[0]-1,p[1]+1) ? 0 : 1;
	marray[8] = isBackground(image.data,p[0]-1,p[1]) ? 0 : 1;
	marray[9] = isBackground(image.data,p[0]-1,p[1]-1) ? 0 : 1;
	cArray = marray;
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
			data[i+2] == 255 &&
			data[i+3] == 255);
}

function isBackground(data,x,y) {
	var i = (width * y + x) * 4;
	return (data[i  ] == 0 &&
			data[i+1] == 0 &&
			data[i+2] == 0 &&
			data[i+3] == 0);
}

function setPixel(data,x,y,pixel) {
	var i = (width * y + x) * 4;
	data[i  ] = pixel[0];
	data[i+1] = pixel[1];
	data[i+2] = pixel[2];
	data[i+3] = pixel[3];
}

function thresholdPixel(data,x,y,min,max) {
	var i = (width * y + x) * 4;
	return (data[i  ] >= min[0] && data[i  ] <= max[0] && 
			data[i+1] >= min[1] && data[i+1] <= max[1] && 
			data[i+2] >= min[2] && data[i+2] <= max[2] && 
			data[i+3] >= min[3] && data[i+3] <= max[3]);
}


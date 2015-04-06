$(function(){

var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	img = new Image(), imgd, 
	width = canvas.width,
	height = canvas.height,
	origArray = [], 
	labels = new Array(width),
	zeros = new Array(height),
	foreground = [255,255,255,255],
	background = [0,0,0,255];

for (var i = 0; i < height; i++) zeros[i] = 0;
for (var i = 0; i < width; i++) labels[i] = zeros.slice();

img.src = '/images/satellite.jpg';
img.onload = function() {
	ctx.drawImage(img, 0, 0);
	imgd = ctx.getImageData(0, 0, width, height);

	imgd.getData = function() {
		var arr = [],
			i = this.data.length;
		while (i--) 
			arr[i] = this.data[i];
		return arr;
	}

	imgd.setData = function(arr) {
		var i = this.data.length;
		while (i--) 
			this.data[i] = arr[i];
	}

	origArray = imgd.getData();
}


$('#button-threshold').click(function(){
	var min = [108,81,90,0];
	var max = [185,131,119,255];

	threshold(imgd,min,max);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-erode').click(function(){
	erode(imgd);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-label').click(function(){
	label(imgd);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-merge').click(function(){
	merge(imgd);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-reset').click(function(){
	imgd.setData(origArray);
	ctx.putImageData(imgd, 0, 0);
});


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

function erode(image) {
	var temp = image.getData();
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isBackground(temp,i,j) || !superimpose(temp,i,j)) {
				setPixel(image.data,i,j,background);
			}
			else {
				setPixel(image.data,i,j,foreground);
			}
		}
	}
}

function label(image) {
	var curlab = 1,
		linked = [];
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isForeground(image.data,i,j)) {
				var neighbors = [];
				if(isForeground(image.data,i+1,j-1)) neighbors.push([i+1,j-1]);
				if(isForeground(image.data,i,j-1)) neighbors.push([i,j-1]);
				if(isForeground(image.data,i-1,j-1)) neighbors.push([i-1,j-1]);
				if(isForeground(image.data,i-1,j)) neighbors.push([i-1,j]);

				if(!neighbors.length) {
					linked[curlab] = [curlab];                  
					labels[i][j] = curlab;
					curlab++;
				}

				else {
					var nl = [];
					if(labels[i+1] && labels[i+1][j-1])
						nl.push(labels[i+1][j-1]);
					if(labels[i] && labels[i][j-1])
						nl.push(labels[i][j-1]);
					if(labels[i-1] && labels[i-1][j-1])
						nl.push(labels[i-1][j-1]);
					if(labels[i-1] && labels[i-1][j])
						nl.push(labels[i-1][j]);

					labels[i][j] = Math.min.apply(null,nl);
					nl.forEach(function(label) {
						if (!linked[label]) linked[label] = [];
						linked[label] = linked[label].concat(nl);
					});
				}
			}
		}
	}
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isForeground(image.data,i,j)) {
				linked.forEach(function(v,i) {
					if (labels[i] && labels[i][j] && 
						v.indexOf(labels[i][j]) > -1) 
					{
						labels[i][j] = i;
						return true;
					}
				});
				//labels[i][j] = find(labels[i][j]);
			}
		}
	}
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(labels[i][j]) {
				setPixel(image.data,i,j,[	(labels[i][j]%255),
											(labels[i][j]*2%255),
											(labels[i][j]*3%255),
											255]);
			}
			else {
				setPixel(image.data,i,j,background);
			}
		}
	}
}

function merge(image) {
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			var arr1 = getPixel(origArray,i,j);
			var arr2 = getPixel(image.data,i,j);
			setPixel(image.data,i,j,[
				(arr1[0]+arr2[0]) / 2,
				(arr1[1]+arr2[1]) / 2,
				(arr1[2]+arr2[2]) / 2,
				255
			]);
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
			data[i+1] == 255 &&
			data[i+2] == 255 &&
			data[i+3] == 255);
}

function isBackground(data,x,y) {
	var i = (width * y + x) * 4;
	return (data[i  ] == 0 &&
			data[i+1] == 0 &&
			data[i+2] == 0 &&
			data[i+3] == 255);
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

function superimpose(data,x,y) {
	return (isForeground(data,x-1,y-1) && 
			isForeground(data,x-1,y) && 
			isForeground(data,x-1,y+1) && 
			isForeground(data,x,y-1) && 
			isForeground(data,x,y) && 
			isForeground(data,x,y+1) && 
			isForeground(data,x+1,y-1) && 
			isForeground(data,x+1,y) && 
			isForeground(data,x+1,y+1));
}

function connectivity(data,x,y) {
	var count;
	if(data[(width * (y+1) + x-1) * 4] == 255) count++;
	if(data[(width * y + x-1) * 4] == 255) count++;
	if(data[(width * (y-1) + x-1) * 4] == 255) count++;
	if(data[(width * (y-1) + x) * 4] == 255) count++; 
	return count;
}

function getData(data) {
	var arr = [],
		i = data.length;
	while (i--) arr[i] = data[i];
	return arr;
}

function setData(data,arr) {
	for (var i = 0; i < data.length; i++) {
		data[i] = arr[i];
	}
}

});

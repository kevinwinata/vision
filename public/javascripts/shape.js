$(function(){

var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	img = new Image(), imgd, 
	width = canvas.width,
	height = canvas.height,
	origArray = [], 
	labels = new Array(width),
	zeros = new Array(height),
	centers = [], sumx = [], sumy = [], npix = [],
	pixelSamples = [],
	processed = false,
	foreground = [255,255,255,255],
	background = [0,0,0,255];

for (var i = 0; i < height; i++) zeros[i] = 0;
for (var i = 0; i < width; i++) labels[i] = zeros.slice();

img.src = '/images/face.jpg';
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


$('#button-contrast').click(function(){
	//lce(10);
	localContrast(imgd,50,1,8);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-colormap').click(function(){
	colorMap(imgd,50,1);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-edge').click(function(){
	edgeDetection(imgd);

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

$('#canvas').on('click', function(e) {
	var x = parseInt(e.pageX - $('#canvas').offset().left);
	var y = parseInt(e.pageY - $('#canvas').offset().top);
	if(processed) { 
		var p = centers[labels[x][y]];
		alert(Math.round(p[0] * 100) / 100 + ", "+ Math.round(p[1] * 100) / 100);
	}
	else {
		var pixel = getPixel(imgd.data,x,y);
		pixelSamples.push(pixel);
		//alert(pixelSamples);
		$("#info").append(pixel[0]+","+pixel[1]+","+pixel[2]+"<br/>");
	}
	// flood(imgd,x,y);
	// ctx.putImageData(imgd, 0, 0);
});

function colorMap(image,maxDistance,mode) {
	var stack = [],
		curlab = 1;

	for (var n = 0; n < pixelSamples.length; n++) {
		for (var i = 0; i < width; i++) {
			for (var j = 0; j < height; j++) {
				if(countDist(image.data,i,j,[pixelSamples[n]],mode) <= maxDistance && 
					labels[i][j] == 0) 
				{
					stack.push([i,j]);
					while(stack.length) {
						var p = stack.pop(),
							px = getPixel(image.data,p[0],p[1]);
						labels[p[0]][p[1]] = curlab;
						if( p[0]-1 >= 0 && labels[p[0]-1] && 
							countDist(image.data,p[0]-1,p[1],[pixelSamples[n]],mode) <= maxDistance && 
							labels[p[0]-1][p[1]] == 0) 
							stack.push([p[0]-1,p[1]]);
						if( p[0]+1 <= width && labels[p[0]+1] && 
							countDist(image.data,p[0]+1,p[1],[pixelSamples[n]],mode) <= maxDistance && 
							labels[p[0]+1][p[1]] == 0) 
							stack.push([p[0]+1,p[1]]);
						if( p[1]-1 >= 0 && labels[p[0]] && 
							countDist(image.data,p[0],p[1]-1,[pixelSamples[n]],mode) <= maxDistance && 
							labels[p[0]][p[1]-1] == 0) 
							stack.push([p[0],p[1]-1]);
						if( p[1]+1 <= height && labels[p[0]] && 
							countDist(image.data,p[0],p[1]+1,[pixelSamples[n]],mode) <= maxDistance && 
							labels[p[0]][p[1]+1] == 0) 
							stack.push([p[0],p[1]+1]);
					}
					curlab++;
				}
			}
		}
	}

	for (var i = 0; i < curlab; i++) sumx[i] = 0;
	for (var i = 0; i < curlab; i++) sumy[i] = 0;
	for (var i = 0; i < curlab; i++) npix[i] = 0;

	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(labels[i][j] != 0) {
				setPixel(image.data,i,j,foreground);
				sumx[labels[i][j]] += i;
				sumy[labels[i][j]] += j;
				npix[labels[i][j]] += 1;
			}
			else {
				setPixel(image.data,i,j,background);
			}
		}
	}

	for (var i = 0; i < curlab; i++) {
		centers[i] = [sumx[i]/npix[i], sumy[i]/npix[i]];
	}
	processed = true;
}

function getMinMax(x0,y0,x1,y1) {
	var min = [255,255,255],
		max = [0,0,0];
	for (var i = x0; i < x1; i++) {
		for (var j = y0; j < y1; j++) {
			var pixel = getPixel(imgd.data,i,j);
			if(pixel[0]<min[0]) min[0] = pixel[0];
			if(pixel[1]<min[1]) min[1] = pixel[1];
			if(pixel[2]<min[2]) min[2] = pixel[2];
			if(pixel[0]>max[0]) max[0] = pixel[0];
			if(pixel[1]>max[1]) max[1] = pixel[1];
			if(pixel[2]>max[2]) max[2] = pixel[2];
		}
	}
	return [min,max];
}

function remap(v,min,max) {
	return (v-min)/(max-min)*v;
}

function lceGetRGB(x,y,r) {
	var minmax = getMinMax(x-r,y-r,x+r,y+r),
		min = minmax[0],
		max = minmax[1],
		pixel = getPixel(imgd.data,x,y);
	return [
		remap(pixel[0],min[0],max[0]),
		remap(pixel[1],min[1],max[1]),
		remap(pixel[2],min[2],max[2]),
		255
	];
}

function lce(r) {
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			setPixel(imgd.data,i,j,lceGetRGB(i,j,r));
		}
	}
}

function localContrast(image,maxDistance,mode,r) {
	var stack = [],
		curlab = 1;

	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(countDist(image.data,i,j,[lceGetRGB(i,j,r)],mode) <= maxDistance && 
				labels[i][j] == 0) 
			{
				stack.push([i,j]);
				var lc = lceGetRGB(i,j,r);
				while(stack.length) {
					var p = stack.pop(),
						px = getPixel(image.data,p[0],p[1]);
					labels[p[0]][p[1]] = curlab;
					if( p[0]-1 >= 0 && labels[p[0]-1] && 
						countDist(image.data,p[0]-1,p[1],[lc],mode) <= maxDistance && 
						labels[p[0]-1][p[1]] == 0) 
						stack.push([p[0]-1,p[1]]);
					if( p[0]+1 <= width && labels[p[0]+1] && 
						countDist(image.data,p[0]+1,p[1],[lc],mode) <= maxDistance && 
						labels[p[0]+1][p[1]] == 0) 
						stack.push([p[0]+1,p[1]]);
					if( p[1]-1 >= 0 && labels[p[0]] && 
						countDist(image.data,p[0],p[1]-1,[lc],mode) <= maxDistance && 
						labels[p[0]][p[1]-1] == 0) 
						stack.push([p[0],p[1]-1]);
					if( p[1]+1 <= height && labels[p[0]] && 
						countDist(image.data,p[0],p[1]+1,[lc],mode) <= maxDistance && 
						labels[p[0]][p[1]+1] == 0) 
						stack.push([p[0],p[1]+1]);
				}
				curlab++;
			}
		}
	}

	for (var i = 0; i < curlab; i++) sumx[i] = 0;
	for (var i = 0; i < curlab; i++) sumy[i] = 0;
	for (var i = 0; i < curlab; i++) npix[i] = 0;

	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(labels[i][j] != 0) {
				setPixel(image.data,i,j,foreground);
				sumx[labels[i][j]] += i;
				sumy[labels[i][j]] += j;
				npix[labels[i][j]] += 1;
			}
			else {
				setPixel(image.data,i,j,background);
			}
		}
	}

	for (var i = 0; i < curlab; i++) {
		centers[i] = [sumx[i]/npix[i], sumy[i]/npix[i]];
	}
	processed = true;
}

function flood(image,x,y) {
	var stack = [],
		px = getPixel(image.data,x,y);
	stack.push([x,y]);
	while(stack.length) {
		var p = stack.pop();
		setPixel(image.data,p[0],p[1],background);
		if( p[0]-1 >= 0 && !isGrey(getPixel(image.data,p[0]-1,p[1]),30)) 
			stack.push([p[0]-1,p[1]]);
		if( p[0]+1 <= width && !isGrey(getPixel(image.data,p[0]+1,p[1]),30)) 
			stack.push([p[0]+1,p[1]]);
		if( p[1]-1 >= 0 && !isGrey(getPixel(image.data,p[0],p[1]-1),30)) 
			stack.push([p[0],p[1]-1]);
		if( p[1]+1 <= height && !isGrey(getPixel(image.data,p[0],p[1]+1),30)) 
			stack.push([p[0],p[1]+1]);
	}
}

function isGrey(pixel,n) {
	return (Math.abs(pixel[0] - pixel[1]) < n &&
			Math.abs(pixel[1] - pixel[2]) < n &&
			Math.abs(pixel[0] - pixel[2]) < n);
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

function edgeDetection(image) {
	var orig = image.getData();
	var temp = image.getData();
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isBackground(orig,i,j) || !superimpose(orig,i,j)) {
				setPixel(temp,i,j,background);
			}
			else {
				setPixel(temp,i,j,foreground);
			}
		}
	}
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			if(isForeground(orig,i,j) && isForeground(temp,i,j)) {
				setPixel(image.data,i,j,[	(labels[i][j]*25%255),
											(labels[i][j]*100%255),
											(labels[i][j]*180%255),
											255]);
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

});

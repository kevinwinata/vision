$(function(){

var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	canvas2 = document.getElementById('canvas2'),
	ctx2 = canvas2.getContext('2d'),
	img = new Image(), imgd, imgd2, 
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

img.src = '/images/organ.bmp';
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

// $('#canvas').on('click', function(e) {
// 	var x = parseInt(e.pageX - $('#canvas').offset().left);
// 	var y = parseInt(e.pageY - $('#canvas').offset().top);
// 	flood(imgd,imgd2,x,y,12);
// 	ctx.putImageData(imgd, 0, 0);
// 	ctx2.putImageData(imgd2, 0, 0);
// });

imgd2 = ctx2.getImageData(0, 0, width, height);

$('#canvas2').on('click',function(e){ 
	var mouseX = parseInt(e.pageX - $('#canvas').offset().left),
		mouseY = parseInt(e.pageY - $('#canvas').offset().top);
	alert(getPixel(imgd2.data,mouseX,mouseY));
});

$('#canvas').on('mousedown',mousedown);

var origX, origY;

function mousedown(e){
	origX = parseInt(e.pageX - $('#canvas').offset().left);
	origY = parseInt(e.pageY - $('#canvas').offset().top);
	
	flood(imgd,imgd2,origX,origY,12);
	ctx.putImageData(imgd,0,0);
	ctx2.putImageData(imgd2,0,0);

	$('#canvas').on("mousemove",mousemove); //start dragging
	$('#canvas').on("mouseup",mouseup);
	return;
}

function mousemove(e) {
	var mouseX = parseInt(e.pageX - $('#canvas').offset().left),
		mouseY = parseInt(e.pageY - $('#canvas').offset().top);
	ctx2.clearRect(0, 0, width, height);
	ctx2.putImageData(imgd2,mouseX-origX, mouseY-origY);
}

function mouseup(e) {
	var mouseX = parseInt(e.pageX - $('#canvas').offset().left),
		mouseY = parseInt(e.pageY - $('#canvas').offset().top);
	drop(imgd,imgd2,mouseX-origX, mouseY-origY);
	ctx.putImageData(imgd,0,0);
	ctx2.clearRect(0, 0, width, height);
	$('#canvas').off("mousemove",mousemove);
	$('#canvas').off("mouseup",mouseup);
}

function flood(image,image2,x,y,n) {
	var stack = [],
		px = getPixel(image.data,x,y),
		arr = [];
	stack.push([x,y]);
	while(stack.length) {
		var p = stack.pop(),
			px = getPixel(image.data,p[0],p[1]);
		if(!isForeground(image.data,p[0],p[1])) {
			setPixel(image2.data,p[0],p[1],px);
			setPixel(image.data,p[0],p[1],foreground);
		}
		if( p[0]-1 >= 0 && !isGrey(getPixel(image.data,p[0]-1,p[1]),n)) 
			stack.push([p[0]-1,p[1]]);
		if( p[0]+1 <= width && !isGrey(getPixel(image.data,p[0]+1,p[1]),n)) 
			stack.push([p[0]+1,p[1]]);
		if( p[1]-1 >= 0 && !isGrey(getPixel(image.data,p[0],p[1]-1),n)) 
			stack.push([p[0],p[1]-1]);
		if( p[1]+1 <= height && !isGrey(getPixel(image.data,p[0],p[1]+1),n)) 
			stack.push([p[0],p[1]+1]);
	}
	return arr;
}

function drop(image,image2,x,y) {
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) { 
			if(!isEmpty(image2.data,i,j))
				setPixel(image.data,i+x,j+y,getPixel(image2.data,i,j));
		}
	}
	for (var i = 0; i < image2.data.length; i++) image2.data[i] = 0;
}

function isGrey(pixel,n) {
	return (Math.abs(pixel[0] - pixel[1]) < n &&
			Math.abs(pixel[1] - pixel[2]) < n &&
			Math.abs(pixel[0] - pixel[2]) < n);
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

function isEmpty(data,x,y) {
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

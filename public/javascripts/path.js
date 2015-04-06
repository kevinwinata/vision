$(function(){
var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	img = new Image(), imgd, 
	width = canvas.width,
	height = canvas.height,
	origArray = [], 
	currentArray = [],
	sourceNode, targetNode,
	foreground = [255,255,255,255],
	background = [0,0,0,255];

img.src = '/images/map.png';
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
	var min = [200,200,100,0];
	var max = [256,256,150,255];

	threshold(imgd,min,max);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-thin').click(function(){
	thin(imgd);

	ctx.putImageData(imgd, 0, 0);
});

$('#button-reset').click(function(){
	imgd.setData(origArray);
	ctx.putImageData(imgd, 0, 0);
});

$('#canvas').on('click', function(e) { 
	var x = parseInt(e.pageX - $('#canvas').offset().left);
    var y = parseInt(e.pageY - $('#canvas').offset().top);
	if(isForeground(imgd.data,x,y)) {
		if (!sourceNode) {
			sourceNode = [x,y];
			alert("source = "+x+" "+y);
		}
		else {
			targetNode = [x,y];
			alert("target = "+x+" "+y);
			trace(imgd,x,y);
		}
	} 
	ctx.putImageData(imgd, 0, 0);
});

function trace(image) {
	var curNode = [],
		nextNode = [],
		path = [],
		stack = [],
		lastIdx;

	curNode = sourceNode;
	path.push(curNode);

	while(curNode[0] != targetNode[0] || curNode[1] != targetNode[1]) {
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
			if(possibleDir.length > 1)
				lastIdx = path.length;
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
		setPixel(image.data,n[0],n[1],[255,0,255,255]);
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

function thin(image) {
	var cArray, AP1, BP1,
		hasChange, aPoint = [], iFollower = 0;
	do {
		hasChange = false;
		var i;
		for(i = 1;i < img.width - 1; i++) {
			for(j = 1; j < img.height - 1; j++) {
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
		for (i = 1; i < img.width - 1; i++) {
			for(j = 1; j < img.height - 1; j++) {
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

function merge() {
	for (var i = 0; i < width; i++) {
		for (var j = 0; j < height; j++) {
			var arr1 = getPixel(origArray,i,j);
			var arr2 = getPixel(currentArray,i,j);
			setPixel(currentArray,i,j,[
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
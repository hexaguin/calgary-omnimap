MQ.mapConfig.getScale = function(zoom) {
	return Math.floor((156543.0339/(2**zoom))*2834.6456664);
}

const haversine = require('haversine-distance');

function filterObjectsByDistance(objects, userCoordinates, maxDistance) {
    return objects.filter(event => {
      const eventCoordinates = event.adr_coordinates.split(',').map(Number);
      const distance = haversine(userCoordinates, eventCoordinates);
      return distance <= maxDistance*1000;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = {
    filterObjectsByDistance
}
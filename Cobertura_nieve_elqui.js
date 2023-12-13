
var dem = ee.Image('USGS/SRTMGL1_003');

// Remap values.
var demclass = ee.Image(1)
          .where(dem.gt(0).and(dem.lte(1000)), 2)
          .where(dem.gt(1000).and(dem.lte(2000)), 3)
          .where(dem.gt(2000).and(dem.lte(3000)), 4)
          .where(dem.gt(4000).and(dem.lte(5000)), 5)
          .where(dem.gt(5000).and(dem.lte(6000)), 6);
          
//Map.addLayer(demclass.clip(coquimboPolygon), {min: 1, max: 17, palette: ['black', 'white']}, 'elevationclass ALOS', false);

// Define a boxcar or low-pass kernel.
var boxcar = ee.Kernel.square({
  radius: 3, units: 'pixels', normalize: true
});

// Smooth the image by convolving with the boxcar kernel.
var smooth = demclass.convolve(boxcar);
//Map.addLayer(smooth.clip(coquimboPolygon), {min: 1, max: 17, palette: ['black', 'white']}, 'smooth ALOS', false);

// Define arbitrary thresholds on the DEM image
var zones = demclass;
zones = zones.updateMask(zones.neq(0));

// Convert DEM zones to thresholds in vectors
var vectors = zones.addBands(demclass).reduceToVectors({
  geometry: coquimboPolygon,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  reducer: ee.Reducer.mean()
});

// Add the vectors to the map
var display = ee.Image(0).updateMask(0).paint(vectors, '000000', 3);
//Map.addLayer(display, {palette: 'ff0000'}, 'contour lines ALOS', false);

// Export the FeatureCollection to a KML file.
Export.table.toDrive({
  collection: vectors,
  description:'contour lines ALOS',
  fileFormat: 'KML'
});

//**************contour lines from SRTM NASA**************

// Add raster.
var elev = ee.Image("USGS/SRTMGL1_003");

// Get elevation.
var strmelevation = elev.select('elevation');
 
                 
// Remap values.
var slopereclass = ee.Image(1)
          .where(strmelevation.gt(0).and(strmelevation.lte(1000)), 2)
          .where(strmelevation.gt(1000).and(strmelevation.lte(2000)), 3)
          .where(strmelevation.gt(3000).and(strmelevation.lte(4000)), 4)
          .where(strmelevation.gt(4000).and(strmelevation.lte(5000)), 5)
          .where(strmelevation.gt(5000).and(strmelevation.lte(6000)), 6);
          
//Map.addLayer(slopereclass.clip(coquimboPolygon), {min: 1, max: 17, palette: ['black', 'white']}, 'elevationclass', false);

////////////////
// Define a boxcar or low-pass kernel.
var boxcar = ee.Kernel.square({
  radius: 3, units: 'pixels', normalize: true
});

// Smooth the image by convolving with the boxcar kernel.
var smooth = slopereclass.convolve(boxcar);
//Map.addLayer(smooth.clip(coquimboPolygon), {min: 1, max: 9, palette: ['black', 'white']}, 'smooth STRM', false);

/////////////////////////////////////////////////////////////////////////

// Define arbitrary thresholds on the STRM image
var zones = slopereclass;
zones = zones.updateMask(zones.neq(0));

// Convert DEM zones to thresholds in vectors
var vectors = zones.addBands(strmelevation).reduceToVectors({
  geometry: coquimboPolygon,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  reducer: ee.Reducer.mean()
});

// Add the vectors to the map
var display = ee.Image(0).updateMask(0).paint(vectors, '000000', 3);
//Map.addLayer(display, {palette: '000000'}, 'contour lines STRM', true, 0.3);

//**************************************2 option****************************************************
// Use a sequence list to define the height interval and the distance between contour lines:
var lines = ee.List.sequence(0, 6000, 1000);

// Define a function to extract contour lines from a 5x3 Gaussian kernel: 
var contourlines = lines.map(function(line) {
  var mycontour = strmelevation
    .convolve(ee.Kernel.gaussian(5, 3))
    .subtract(ee.Image.constant(line)).zeroCrossing() 
    .multiply(ee.Image.constant(line)).toFloat();
    
  return mycontour.mask(mycontour);
});



// Definir el polígono que representa la región de Coquimbo en Chile
var coquimboPolygon = ee.FeatureCollection("projects/ee-prommrandvi/assets/CUENCA");

// Cargar el DEM de altitud
var dem = ee.Image('USGS/SRTMGL1_003');

var clipedddem = dem.clip(coquimboPolygon);

print(clipedddem)

var contours = ee.FeatureCollection('users/balaji_nbrc/nbrc_1k_contours');

Map.addLayer(contours, {color: 'brown'}, 'Curvas de Nivel');

// Crear un mapa centrado en una ubicación específica
Map.setCenter(-71.325, -30, 9);

// Crear widgets para seleccionar fechas manualmente
var startDateInput = ui.Textbox({
  value: '2022-06-01',
  onChange: function(value) {
    updateMap();
  },
  placeholder: 'YYYY-MM-DD'
});

var endDateInput = ui.Textbox({
  value: '2022-08-01',
  onChange: function(value) {
    updateMap();
  },
  placeholder: 'YYYY-MM-DD'
});

var updateButton = ui.Button({
  label: 'Actualizar Mapa',
  onClick: function() {
    updateMap();
  }
});

// Función para actualizar el mapa con las fechas y límite de región seleccionados
function updateMap() {
  var startDate = ee.Date(startDateInput.getValue());
  var endDate = ee.Date(endDateInput.getValue());

  // Filtrar la colección de imágenes para el rango de fechas seleccionado
  var selectedImages = ee.ImageCollection('MODIS/061/MOD10A1')
    .filterDate(startDate, endDate.advance(1, 'day'));

  // Obtener la mediana de las imágenes para evitar problemas con el método .mosaic()
  var medianImage = selectedImages.median();

  // Recortar la imagen de nieve con el polígono
  var clippedImage = medianImage.clip(coquimboPolygon);
  
  var recortadaImagen = clippedImage.updateMask(clippedImage.select('NDSI_Snow_Cover').gt(25));

  var suavizadaImagen = recortadaImagen.focal_mode();

  // Añadir la nueva capa al mapa
  Map.layers().reset();
  ///Map.addLayer(clipedddem, {min: 0, max: 6000, palette: ['006633', 'E5FFCC', '662A00', 'black']},'Modelo Digital de elevación (DEM)');
  Map.addLayer(coquimboPolygon, { color: '05224F' },'Cuenca Río Elqui');
  Map.addLayer(recortadaImagen, {
    'bands': 'NDSI_Snow_Cover',
    'min': 0.0,
    'max': 100.0,
    'palette':['d5d5d5', 'f2f2f2','ffffff'],
  }, 'Cobertura de nieve');
  contourlines = ee.ImageCollection(contourlines).mosaic();
  Map.addLayer(contourlines.clip(coquimboPolygon), {min: 1000, max: 6000, palette: ['a5ecff', '36886A', '82B513', 'EDC823', 'F68E19', 'FF1100'] }, 'contours lines');
}

// Crear un panel de control y añadir los widgets
var panel = ui.Panel({
  widgets: [startDateInput, endDateInput, updateButton],
  style: { position: 'bottom-left' }
});

// Añadir el panel al mapa
Map.add(panel);

// Inicializar el mapa con las fechas predeterminadas
updateMap();



// INCORPORACION DE LEYENDAS EN GEE
// http://www.gisandbeers.com/incorporacion-leyenda-en-google-earth-engine/

// Descripcion del etiquetado de elementos de la leyenda DEM
var Etiquetas = [
  '1.000 msnm',
  '2.000 msnm',
  '3.000 msnm',
  '4.000 msnm',
  '5.000 msnm',
  '6.000 msnm'];

// Configuracion del titulo y posicion de la leyenda
var Titulo = ui.Label({
  value: 'Niveles de altitud', // Titulo de la leyenda
  style: {fontWeight: 'bold', fontSize: '20px', margin: '0px 0px 15px 0px',}}); // Estilo y dimensiones
var Leyenda = ui.Panel({
  style: {position: 'bottom-left', padding: '10px 20px'}}); // Posicion, altura y anchura
Leyenda.add(Titulo);

// Configuracion de la simbologia
var Simbologia = ['a5ecff', '36886A', '82B513', 'EDC823', 'F68E19', 'FF1100'];
var Simbolos = function(simbolo, texto) {
var TextoLeyenda = ui.Label({
  value: texto,
  style: {margin: '6px 0px 10px 15px'}}); // Posicion en la separacion de los textos
var CajaLeyenda = ui.Label({
  style: {backgroundColor: '#' + simbolo,
  padding: '15px', // TamaÃ±o del simbolo
  margin: '0px 0px 6px 0px'}}); // Posicion en la separacion de los simbolos

//Representacion de leyenda en el visor
return ui.Panel({
  widgets: [CajaLeyenda, TextoLeyenda],
  layout: ui.Panel.Layout.Flow('horizontal')});};
for (var i = 0; i < 6; i++) {Leyenda.add(Simbolos(Simbologia[i], Etiquetas[i]));} 
Map.add(Leyenda);

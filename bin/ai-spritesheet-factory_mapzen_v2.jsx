﻿/* Portions based on work by Anselm Bradford (http://twitter.com/anselmbradford)        */
/* Anselm's portions are copyright 2013 Anselm Bradford via Apache License, Version 2.0 */
/* https://github.com/anselmbradford/ai-webdev-scripts/tree/master/ai-spritesheet-factory */


// constants parsed from the config file (not really constants because it's JS, but you get the idea)
var MAX_WIDTH = null;
var X_GAP = null;
var Y_GAP = null;
var COMMON_BADGE_SIZE = null;
var ROOT_LAYER = null;
var SKIP_LAYER = null;
var AREA_LAYER = null;
var HIT_LAYER = null;
var FILTER_LAYER = null;
var EXPORT_AREA_LAYER = null;
var EXPORT_AS_BLACK_AND_WHITE_MASK = null;
var EXPORT_AS_GREY_MASK = null
var EXPORT_FORMAT = null;
var EXPORT_RESOLUTION = null;
var EXTRA_RESOLUTIONS = false;
var JPG_QUALITY = null;
var OUTPUT_FILENAME = null;
var PARAM_FORMAT = null;
var PARAM_TYPE = null;
var MOVE_SPRITES_TO_NEW_GRID = null;
var PRESERVE_GRID = null;
var MORE_TEXTURES = true;

// variables
var offsetX = 0; // the horizontal amount to move a graphic (is based on the position of the prior graphic)
var offsetY = 0; // the vertical amount to move a graphic (is based on the position of the prior graphic)
var count = 0;
var tallest = 0;
var lastLeft = 0;
var lastTop = 0;
var newArtboardTop = lastTop;
var newArtboardBottom = 0;
var newArtboardLeft = lastLeft;
var newArtboardRight = 0;


var output = []; // contents of output file

var doc; // the active document
var folderPath;
var filePath;
var configFile;
var parsed = true; // whether config file was parsed correctly
var errorMsg = "There is a problem in the configuration file. "; // error message if something goes wrong with reading config file
var readConfig; // holds reference to the configuration file

// if there are graphics on the artboard
if ( app.documents.length > 0 ) {

    doc = app.activeDocument;
    filePath = doc.path+"/bin/ai-spritesheet-factory-config.yml";
    configFile = new File(filePath);

    // if config file is not found, create default config
    if (configFile.open('r') == false) createDefaultConfig();

    // read the config file and parse out values
    configFile.open('r');
    readConfig = configFile.read();

    MAX_WIDTH = parseConfig( "max_width" , Number );
    X_GAP = parseConfig( "x_gap" , Number );
    Y_GAP = parseConfig( "y_gap" , Number );
    COMMON_BADGE_SIZE =  parseConfig( "common_badge_size" , Number );
    ROOT_LAYER = parseConfig( "root_layer_prefix" );
    SKIP_LAYER = parseConfig( "skip_layer_prefix" );
    AREA_LAYER = parseConfig( "area_layer_prefix" );
    HIT_LAYER = parseConfig( "hit_layer_prefix" );
    FILTER_LAYER = parseConfig( "filter_layer_prefix" );
    FILTER_LAYER += ":";
    ZOOM_FILTER_LAYER = parseConfig( "zoom_filter_layer_prefix" );
    ZOOM_FILTER_LAYER += ":";
    EXPORT_AREA_LAYER = convertStringToBoolean( parseConfig( "export_area_layer" ) );
    EXPORT_AS_BLACK_AND_WHITE_MASK = convertStringToBoolean( parseConfig( "export_as_black_and_white_mask" ) );
    EXPORT_AS_GREY_MASK = convertStringToBoolean( parseConfig( "export_as_grey_mask" ) );
    EXPORT_RESOLUTION = parseFloat( parseConfig( "export_resolution" ) ) * 100;
    EXPORT_FORMAT = parseConfig( "export_format" );
    JPG_QUALITY = parseConfig( "jpg_quality" , Number );
    OUTPUT_FILENAME = parseConfig( "output_filename" );
    PARAM_FORMAT = parseConfig( "param_format" );
    PARAM_TYPE = parseConfig( "param_type" );

    GENERATE_HTML = convertStringToBoolean( parseConfig( "generate_html" ) );
    GENERATE_CSS = convertStringToBoolean( parseConfig( "generate_css" ) );
    GENERATE_CSS_USING_FILTER_AUTO_LOOKUP = convertStringToBoolean( parseConfig( "generate_css_using_filter_auto_lookup" ) );
    GENERATE_PARAM = convertStringToBoolean( parseConfig( "generate_param" ) );

    MOVE_SPRITES_TO_NEW_GRID = convertStringToBoolean( parseConfig( "move_sprites_to_new_grid" ) );
    PRESERVE_GRID = convertStringToBoolean( parseConfig( "preserve_grid" ) );
    // debug
    //PRESERVE_GRID = true

    OUTPUT_FILENAME = doc.name.split('.')[0];
    var ORIG_OUTPUT_FILENAME = OUTPUT_FILENAME;

    EXTRA_RESOLUTIONS = false;

    var resolutions = [];

    if ( EXTRA_RESOLUTIONS ) {
        resolutions = [100, 200, 300, 400, 800, 1600];
    } else {
        resolutions = [ EXPORT_RESOLUTION ];
    }

    for (var r = 0; r < resolutions.length; r++) {
        EXPORT_RESOLUTION = resolutions[r];
        OUTPUT_FILENAME = ORIG_OUTPUT_FILENAME

        offsetX = 0; // the horizontal amount to move a graphic (is based on the position of the prior graphic)
        offsetY = 0; // the vertical amount to move a graphic (is based on the position of the prior graphic)
        count = 0;
        tallest = 0;
        lastLeft = 0;
        lastTop = 0;
        newArtboardTop = lastTop;
        newArtboardBottom = 0;
        newArtboardLeft = lastLeft;
        newArtboardRight = 0;
        output = [];

        // If this a HiDPI or 3x export, adjust the file name
        if ( EXPORT_RESOLUTION == 200 ) {
            OUTPUT_FILENAME += "@2x";
        } else if ( EXPORT_RESOLUTION == 300 ) {
            OUTPUT_FILENAME += "@3x";
        } else {
            OUTPUT_FILENAME += "@" + EXPORT_RESOLUTION/100 + "x";
        }

        // TODO validation of output_format in regard to output_type

        // if it wasn't parsed, abort
        if (!parsed) {
            alert( errorMsg );
        } else {
            if ( checkLayerHierarchy()) {
                // Get rid of stuff that shouldn't export
                cleanLayers( doc , 0 );

                // Move to industrial grid
                if ( MOVE_SPRITES_TO_NEW_GRID ) {
                   moveLayer( doc , 0 );
                }

                // Build CSS regions
                recordPosition( doc );

                if (output.length > 1) {
                    // fit artboard to artworks's visible bounds to make export bit happy
                    app.activeDocument.artboards[0].artboardRect = app.activeDocument.visibleBounds;

                    // create build directory
                    folderPath = new Folder(doc.path+"/spritesheet");
                    folderPath.create();

                    // export spritesheet in format specified in the config file
                    if (EXPORT_FORMAT == "png24") exportPNG24();
                    else if (EXPORT_FORMAT == "png8") exportPNG8();
                    else if (EXPORT_FORMAT == "gif") exportGIF();
                    else if (EXPORT_FORMAT == "jpg") exportJPEG();
                    else if (EXPORT_FORMAT == "svg") exportSVG();

                    // write css, html, and parameters
                    if (GENERATE_CSS) writeCSS();
                    if (GENERATE_HTML) writeHTML();
                    if (GENERATE_PARAM) writeParameters();

                    // undo changes done to file
                    if ( !PRESERVE_GRID )
                    {
                        app.undo();
                    }
                } else {
                    // error occurred, undo changes done to file
                    app.undo();
                    app.redo(); // need this for some reason as the undo seems to go one step too far!
                    errorMsg = "Sprite export failed! There are one or less sprites. Check that sprite layers have same prefixes as config file!";
                    alert( errorMsg );
                }
            } else {
                // error occurred, undo changes done to file
                app.undo();
                app.redo(); // need this for some reason as the undo seems to go one step too far!
                errorMsg = "Sprite export failed! There is a problem with the layers in this Illustrator file! Check that sprite layers have same prefixes as config file!";
                alert( errorMsg );
            }
        }
    }
}

// convert string to boolean, sadly we can't do this with typecasting with Boolean in parseConfig
function convertStringToBoolean( value )
{
    if (value == "true") value = true;
    else value = false;
    return value;
}

// regex parse config file
// value = value to search for in config file
// type = type to cast to
function parseConfig( value , type )
{
    var reg = value + "[ ]*:[ ]*(.*)";
    var pattern = new RegExp(reg);
    var result = pattern.exec(readConfig);
    var returnVal;
    if (!result) { parsed = false; errorMsg += (" Check near '"+value+"'.") }
    else
    {
        returnVal = result[1];
        if (type) returnVal = type(returnVal);
    }
    if (returnVal == '' || returnVal == null || (type == Number && isNaN(returnVal) ) ) { parsed = false; errorMsg += (" Check value of '"+value+"'.")}

    return returnVal;
}

// check that the sprites are one level in
function checkLayerHierarchy()
{
    var returnVal = false;
    if (doc.layers.length > 0)
    {
        for (var l = 0; l < doc.layers.length; l++)
        {
            var layer = doc.layers[l];
            if (layer.name.substring(0,ROOT_LAYER.length) == ROOT_LAYER)
            {
                for (var a = 0; a < layer.pageItems.length; a++)
                {
                    if (layer.pageItems[a].name.substring(0,AREA_LAYER.length) == AREA_LAYER)
                    {
                        returnVal = true;
                    }
                }
            }
            else
            {
                layer.visible = false;
            }
        }
    }

    return returnVal;
}

// clean up (remove) features that don't print on each layer
function cleanLayers( layer, level)
{
    if (layer.typename == "Layer" )
    {
        var pathArt;
        var numPageItems = layer.pageItems.length;

        // Layer marked skip in the layer name should be set to not print
        if ( layer.name.substring(0,SKIP_LAYER.length) == SKIP_LAYER )
        {
            layer.printable = false;
        }

        // Delete stuff in layers that aren't printable
        if ( layer.typename == "Layer" && !layer.printable )
        {
            // If the layer has content
            if( numPageItems > 0 && layer.visible )
            {
                for (e = 0; e < numPageItems; e++)
                {
                    pathArt = layer.pageItems[e];
                    try {
                        pathArt.remove();
                    } catch(err) {
                        pathArt.visible = false;
                        //alert( "Problem removing feature in layer " + layer.name + " with name " + pathArt.name );
                    }
                }
            }
        }
    }

    for (var l = 0; l < layer.layers.length; l++)
    {
        cleanLayers( layer.layers[l], level+1 );
    }
}

// move the graphics on each layer
function moveLayer( layer, level )
{
    if (layer.typename == "Layer" && layer.printable)
    {
        var pathArt;
        var numPageItems = layer.pageItems.length;
        var moved = false;

        // Make sure we can move features around
        if ( layer.typename == "Layer" && layer.locked )
        {
            layer.locked = false;
        }

        // Collect remaining page items
        numPageItems = layer.pageItems.length;

        // If the layer has content
        if( numPageItems > 0 )
        {
            // bring area layers to front
            for (var e = 0; e < numPageItems; e++)
            {
                pathArt = layer.pageItems[e];
                moved = false;

                try {
                    if ( pathArt.name.substring(0,AREA_LAYER.length) == AREA_LAYER && level == 1 )
                    {
                        if ( !EXPORT_AREA_LAYER )
                        {
                            pathArt.zOrder( ZOrderMethod.BRINGTOFRONT );
                        }

                        // visibleBounds is an array of [left, top, right, bottom], with Y counting NEG down, X counting POS right
                        // eg: [622, -9, 644, -27]
                        // eg: [762.75,-1321.25,791.25,-1338.75]
                        
                        //alert( pathArt.visibleBounds );

                        var pa_left   = Math.floor( pathArt.visibleBounds[0] );
                        var pa_top    = Math.floor( pathArt.visibleBounds[1] );
                        var pa_left_inside   = pathArt.visibleBounds[0];
                        var pa_top_inside    = pathArt.visibleBounds[1];
                        var pa_width  = Math.ceil( Math.ceil(pathArt.visibleBounds[2]) - Math.floor(pathArt.visibleBounds[0]) );
                        var pa_height = Math.ceil( Math.ceil(pathArt.visibleBounds[1]) - Math.floor(pathArt.visibleBounds[3]) );
                        
                        //alert( pa_height );
                        
                        var pa_bottom = pa_top + pa_height;
                        var pa_right  = pa_left + pa_width;
                        //var vb_height = pathArt.height;
                        //var pa_left   = pathArt.left;
                        //var pa_top    = pathArt.top;
                        //var pa_width  = pathArt.width;
                        //var pa_height = pathArt.height;

                        if ( lastLeft + pa_width + X_GAP > MAX_WIDTH )
                        {
                            lastLeft = 0;
                            lastTop -= tallest + Y_GAP;
                            tallest = 0;
                        }

                        // Offset the badge stuff
                        offsetX = lastLeft - pa_left; // pathArt.left;
                        offsetY = lastTop - pa_top;   // pathArt.top;

                        offsetX_inside = lastLeft - pa_left_inside; // pathArt.left;
                        offsetY_inside = lastTop - pa_top_inside;   // pathArt.top;

                        pathArt.left = lastLeft;
                        pathArt.top = lastTop;

                        // keep running tally of total extent of artwork for resetting the artboard later
                        if( pa_bottom > newArtboardBottom ) {  // pathArt.bottom
                            newArtboardBottom = pa_bottom;     // pathArt.bottom;
                        }
                        if( pa_right > newArtboardRight ) {    // pathArt.right
                            newArtboardRight = pa_right;       // pathArt.right;
                        }

                        lastLeft += pa_width + X_GAP;
                        //lastTop = Math.floor( pathArt.visibleBounds[1] );

                        tallest = Math.max(tallest, pa_height);

                        moved = true;
                    }
                } catch(err) {
                    if (!moved) { alert( "Problem with " + layer.name ) };
                }
            }

            for (e = 0; e < numPageItems; e++)
            {
                pathArt = layer.pageItems[e];

                if ( !(pathArt.name.substring(0,AREA_LAYER.length) == AREA_LAYER && level == 1) )
                {
                    try{
                        pathArt.translate(offsetX_inside,offsetY_inside);
                    } catch(err){
                        pathArt.translate(offsetX,offsetY);
                    }
                }

<!--
                // Force export to be black & white mask instead of color
                if ( (EXPORT_AS_BLACK_AND_WHITE_MASK || EXPORT_AS_GREY_MASK) && ( pathArt.typename == "PathItem" || pathArt.typename == "GroupItem" || pathArt.typename == "CompoundPathItem" )
                {
                    convertBlackAndWhiteOrGreyscale( pathArt )
                }
 -->
            }
        }
    }

    for (var l = 0; l < layer.layers.length; l++)
    {
        moveLayer( layer.layers[l] , level+1 );
    }
}


function convertBlackAndWhiteOrGreyscale( pathArt )
{
    if (EXPORT_AS_BLACK_AND_WHITE_MASK )
    {
        // Replacement color is black
        var black_RGBColor = new RGBColor();
            black_RGBColor.red = 0;
            black_RGBColor.green = 0;
            black_RGBColor.blue = 0;
    }

    if ( pathArt.filled )
    {
        if( intent == EXPORT_AS_GREY_MASK )
        {
            pathArt.fillColor = app.convertSampleColor(pathArt.fillColor.typename,
                                                       pathArt.fillColor,
                                                       ImageColorSpace.Grayscale,
                                                       ColorConvertPurpose.exportpurpose);
        } else {

        }
    }

    if ( pathArt.stroked )
    {
        if( intent == EXPORT_AS_GREY_MASK )
        {
            pathArt.strokeColor = app.convertSampleColor(pathArt.strokeColor.typename,
                                                         pathArt.strokeColor,
                                                         ImageColorSpace.Grayscale,
                                                         ColorConvertPurpose.exportpurpose);
        }
    }

}

// record the positions of the graphics on each layer
function recordPosition( layer ) {
    if (layer.typename == "Layer" && layer.visible == true) {
        for (var e = 0; e < layer.pageItems.length; e++) {
            var pathArt = layer.pageItems[e];

            // if current layer is the root layer, record position
            if (pathArt.name.substring(0,AREA_LAYER.length) == AREA_LAYER) {
                if ( !EXPORT_AREA_LAYER ) {
                    pathArt.opacity = 0;
                }

                // We use visibleBounds here instead of geometricBounds
                // to prevent clipping to account for artwork stroke widths

                var pa_left   = Math.floor( pathArt.visibleBounds[0] );
                var pa_top    = Math.ceil( pathArt.visibleBounds[1] );
                // visibleBounds should include the stroke width but doesn't in CC 2017 so let's hard code 1 pt stroke width
                var pa_width  = Math.ceil( Math.ceil(pathArt.visibleBounds[2]) - Math.floor(pathArt.visibleBounds[0]) );
                // because 3rd quadrant math!?
                var pa_height = Math.ceil( Math.ceil(pathArt.visibleBounds[1]) - Math.floor(pathArt.visibleBounds[3]) );

                //var pa_left   = pathArt.left;
                //var pa_top    = pathArt.top;
                //var pa_width  = pathArt.width;
                //var pa_height = pathArt.height;

                var x = Math.floor( pa_left * EXPORT_RESOLUTION/100 );
                var y = Math.ceil( pa_top * EXPORT_RESOLUTION/100 * -1 );
                var width = Math.ceil( pa_width * EXPORT_RESOLUTION/100);      // 18 px = 36
                var height = Math.ceil( pa_height * EXPORT_RESOLUTION/100);    // 17.944 px = 35.888

                // If the width or height are within 3 px of COMMON_BADGE_SIZE, just make them the COMMON_BADGE_SIZE
                if( app.activeDocument.name.indexOf('shield') == -1 ) {
                    if( Math.abs( width - (COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100)) <= 3 ) {
                        width = COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100;
                    }
                    if( Math.abs( height - (COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100)) <= 3 ) {
                        height = COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100;
                    }

                    // General catch all that if it looks square, it should be square
                    if( Math.abs( width - height) <= 2 ) {
                        width = Math.max( width, height);
                        height = width;
                    } else if( Math.abs( width - height) <= 4 ) {
                        width = (width + height) / 2;
                        height = width;
                    }
                }

                var hitAreaX = (pa_left < 0 ? 0 : pa_left) * EXPORT_RESOLUTION/100;
                var hitAreaY = (pa_top  < 0 ? 0 : pa_top ) * EXPORT_RESOLUTION/100;
                var hitAreaWidth = pa_width * EXPORT_RESOLUTION/100;
                var hitAreaHeight = pa_height * EXPORT_RESOLUTION/100;

                if( app.activeDocument.name.indexOf('shield') == -1 ) {
                    // If the hitAreaWidth or hitAreaHeight are within 3 px of COMMON_BADGE_SIZE, just make them the COMMON_BADGE_SIZE
                    if( Math.abs( hitAreaWidth - (COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100)) <= 3 ) {
                        hitAreaWidth = COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100;
                    }
                    if( Math.abs( hitAreaHeight - (COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100)) <= 3 ) {
                        hitAreaHeight = COMMON_BADGE_SIZE * EXPORT_RESOLUTION/100;
                    }
                }
                
                // General catch all that if it looks square, it should be square
                if( Math.abs( hitAreaWidth - hitAreaHeight) <= 2 ) {
                    hitAreaWidth = Math.max( hitAreaWidth, hitAreaHeight);
                    hitAreaHeight = hitAreaWidth;
                } else if( Math.abs( hitAreaWidth - hitAreaHeight) <= 4 ) {
                    hitAreaWidth = (hitAreaWidth + hitAreaHeight) / 2;
                    hitAreaHeight = hitAreaWidth;
                }

                // default the filter to the name of the layer
                var filter = layer.name.substr(1,);
                // OSM tags are _ whitespace, swap the auto-generated filters only (if manual, up to operator)
                filter.replace( "-", "_" );

                var customFilter = false;
                var zoom_filter = '-1';

                for (var p = 0; p < layer.pageItems.length; p++)
                {
                    var currPathArt = layer.pageItems[p];
                    if (currPathArt.name.substring(0,HIT_LAYER.length) == HIT_LAYER)
                    {
                        var cpa_left   = Math.floor( pathArt.visibleBounds[0] );
                        var cpa_top    = Math.ceil( pathArt.visibleBounds[1] );
                        var cpa_width  = Math.ceil( Math.ceil(pathArt.visibleBounds[2]) - Math.floor(pathArt.visibleBounds[0]) );
                        var cpa_height = Math.ceil( Math.floor(pathArt.visibleBounds[1]) - Math.ceil(pathArt.visibleBounds[3]) );

                        //var cpa_left   = pathArt.left;
                        //var cpa_top    = pathArt.top;
                        //var cpa_width  = pathArt.width;
                        //var cpa_height = pathArt.height;

                        // find hit area or report error
                           currPathArt.opacity = 0;
                           hitAreaX = (cpa_left < 0 ? 0 : cpa_left) * EXPORT_RESOLUTION/100;
                           hitAreaY = (cpa_top  < 0 ? 0 : cpa_top ) * EXPORT_RESOLUTION/100;
                           hitAreaWidth = cpa_width * EXPORT_RESOLUTION/100;
                           hitAreaHeight = cpa_height * EXPORT_RESOLUTION/100;
                    }
                }
                for (var p = 0; p < layer.layers.length; p++)
                {
                    // detect if there should be a custom filter
                    if (layer.layers[p].name.substring(0,FILTER_LAYER.length) == FILTER_LAYER)
                    {
                        // determine what filters are applied in Illustrator layer names
                        filter = layer.layers[p].name.substring(FILTER_LAYER.length+1,);
                        // turn that layer off
                        layer.layers[p].opacity = 0;

                        if( !MORE_TEXTURES ) {
                            // set customFilter boolean
                            customFilter = true;
                        }
                    }

                    // detect if there should be a custom zoom filter
                    if (layer.layers[p].name.substring(0,ZOOM_FILTER_LAYER.length) == ZOOM_FILTER_LAYER)
                    {
                        zoom_filter = layer.layers[p].name.substring(ZOOM_FILTER_LAYER.length+1,);
                        layer.layers[p].opacity = 0;
                        customFilter = true;
                    }
                }

                // The artboard doesn't start at 0,0
                if ( !MOVE_SPRITES_TO_NEW_GRID )
                {
                    x -= app.activeDocument.artboards[0].artboardRect[0] * EXPORT_RESOLUTION/100;
                    y -= app.activeDocument.artboards[0].artboardRect[1] * EXPORT_RESOLUTION/100;
                }

                output.push({"name":layer.name,"x":x,"y":y,"width":width,"height":height,"hitX":hitAreaX,"hitY":hitAreaY,"hitWidth":hitAreaWidth,"hitHeight":hitAreaHeight,"filter":filter,"filterIsCustom":customFilter,"zoom_filter":zoom_filter});
            }

//             //Can only select features that aren't locked and are visible
//             if( !pathArt.hidden && !pathArt.locked )
//             {
//                 pathArt.selected = true;
//             }
        }
    }

    for (var l = 0; l < layer.layers.length; l++)
    {
        recordPosition( layer.layers[l] );
    }
}

// export a png24 file
function exportPNG24() {
    var exportOptions = new ExportOptionsPNG24();
    var type = ExportType.PNG24;
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".png";
    var fileSpec = new File(filePath);
    if (!MOVE_SPRITES_TO_NEW_GRID ) {
        exportOptions.artBoardClipping = true;
    }
    exportOptions.artBoardClipping = true;
    exportOptions.transparency = true;
    exportOptions.horizontalScale = EXPORT_RESOLUTION;
    exportOptions.verticalScale   = EXPORT_RESOLUTION;
    doc.exportFile( fileSpec, type, exportOptions );
}

// export a png8 file
function exportPNG8() {
    var exportOptions = new ExportOptionsPNG8();
    var type = ExportType.PNG8;
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".png";
    var fileSpec = new File(filePath);
    if (!MOVE_SPRITES_TO_NEW_GRID ) {
        exportOptions.artBoardClipping = true;
    }
    exportOptions.artBoardClipping = false;
    exportOptions.transparency = true;
    exportOptions.horizontalScale = EXPORT_RESOLUTION;
    exportOptions.verticalScale   = EXPORT_RESOLUTION;
    exportOptions.colorCount      = 256;
    doc.exportFile( fileSpec, type, exportOptions );
}

// export a gif
function exportGIF() {
    var exportOptions = new ExportOptionsGIF();
    var type = ExportType.GIF;
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".png";
    var fileSpec = new File(filePath);
    if (!MOVE_SPRITES_TO_NEW_GRID ) {
        exportOptions.artBoardClipping = true;
    }
    exportOptions.horizontalScale = EXPORT_RESOLUTION;
    exportOptions.verticalScale   = EXPORT_RESOLUTION;
    doc.exportFile( fileSpec, type, exportOptions );
}

// export a jpg
function exportJPEG() {
    var exportOptions = new ExportOptionsJPEG();
    var type = ExportType.JPEG;
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".png";
    var fileSpec = new File(filePath);
    if (!MOVE_SPRITES_TO_NEW_GRID ) {
        exportOptions.artBoardClipping = true;
    }
    exportOptions.horizontalScale = EXPORT_RESOLUTION;
    exportOptions.verticalScale   = EXPORT_RESOLUTION;
    exportOptions.optimization = true; // optimized for web viewing
    exportOptions.qualitySetting = JPG_QUALITY;
    doc.exportFile( fileSpec, type, exportOptions );
}

// export a svg
function exportSVG() {
    var exportOptions = new ExportOptionsSVG();
    var type = ExportType.SVG;
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".svg";
    var fileSpec = new File(filePath);
    // if (!MOVE_SPRITES_TO_NEW_GRID ) {
    //     exportOptions.artBoardClipping = true;
    // }
    //exportOptions.horizontalScale = EXPORT_RESOLUTION;
    //exportOptions.verticalScale   = EXPORT_RESOLUTION;
    //exportOptions.optimization = true; // optimized for web viewing
    //exportOptions.qualitySetting = JPG_QUALITY;
    app.activeDocument.exportFile( fileSpec, type, exportOptions );
}

// write CSS output file
function writeCSS() {
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".yaml";
    var outputFile =new File(filePath);
    var finalOutput = "";
       outputFile.open('w');

    var filesuffix = EXPORT_FORMAT;
    if (EXPORT_FORMAT == "png24" || EXPORT_FORMAT == "png8") filesuffix = "png";

       var textures =  "textures:\n";
           textures += "    pois:\n";
           textures += "        url: "+OUTPUT_FILENAME+".png\n";
           textures += "        density: " + EXPORT_RESOLUTION / 100 + "\n";
           textures += "        filtering: mipmap\n";
           textures += "        sprites:\n";
           textures += "            # define sprites: [x origin, y origin, width, height]\n";
        
       var styles =  "styles:\n";
           styles += "    icons:\n";
           styles += "        base: points\n";
           styles += "        texture: pois\n";

       var icons =  "layers:\n";
           icons += "    poi_icons:\n";
           icons += "        data: { source: mapzen, layer: pois }\n";
           icons += "        filter: { name: true, not: { kind: [peak, viewpoint, bicycle_rental, car_sharing] }, $zoom: { min: 15 } }\n";
           icons += "        draw:\n";
           icons += "            icons:\n";
           icons += "                size: [[13, 12px], [15, 18px]]\n";
           icons += "                interactive: true\n";
           // Default to type lookups into the texture sprite sheet based on the feature's kind attribute
           icons += "\n";
           icons += "        # default icon at high zoom\n";
           icons += "        default_on_kind:\n";
           icons += "            draw: { icons: { sprite: function() { return feature.kind; } } }\n";
           //
           //icons += "        # add generic icon at high zoom\n";
           //icons += "        generic:\n";
           //icons += "            #filter: { $zoom: { min: 18 } }\n";
           //icons += "            draw: { icons: { sprite: generic } }\n";

       var shields = "";
           shields += "    shields:\n";
           shields += "        data: { source: mapzen, layer: roads }\n";
           shields += "        filter: { network: [";

       var shields_src = [];

       // Sort alphabetically
       output.sort( sortAlpha );

       var firstCustom = true;
       //var artboard_width  = Math.ceil( app.activeDocument.visibleBounds[2] - app.activeDocument.visibleBounds[0]);
       //var artboard_height = Math.ceil( app.activeDocument.visibleBounds[1] - app.activeDocument.visibleBounds[3]);

       for (var i = 0; i < output.length; i++)
       {
            var name =  output[i]["name"].substr(1,);
            var x = (output[i]["x"] < 0 ? 0 : output[i]["x"]);
            var y = (output[i]["y"] < 0 ? 0 : output[i]["y"]);
            var width = output[i]["width"];
            var height = output[i]["height"];
            var hitX = (output[i]["hitX"] < 0 ? 0 : output[i]["hitX"]);
            var hitY = (output[i]["hitY"] < 0 ? 0 : output[i]["hitY"]);
            var hitWidth  = output[i]["hitWidth"]
            var hitHeight = output[i]["hitHeight"]
            //var hitWidth  = (output[i]["hitWidth"]  + hitX > artboard_width  ? artboard_width  - hitX : output[i]["hitWidth"]  )
            //var hitHeight = (output[i]["hitHeight"] + hitY < artboard_height ? artboard_height - hitY : output[i]["hitHeight"] )

            // Always output the full texture definition for the sprite sheet
            textures += "            "+name+": ["+x+", "+y+", "+width+", "+height+"]\n";
            
            name_stripped = stripCharCount( name );
            shields_src.push( name_stripped );
            
            if( MORE_TEXTURES ) {
                // strip out whitespace, and then then split into an array based on , deliminator
                texture_aliases = output[i]["filter"].replace(/ /g,'').split(",")

                // for each of the aliases
                for (var t = 0; t < texture_aliases.length; t++) {
                    // as long as it's not the same as the base texture name, export it again
                    if( name != texture_aliases[t] ) {
                        textures += "            "+texture_aliases[t]+": ["+x+", "+y+", "+width+", "+height+"]\n";
                        name_stripped = stripCharCount( texture_aliases[t] );
                        shields_src.push( name_stripped );
                    }
                }
            }

            if( output[i]["filterIsCustom"] ) {
                // If this is the first custom filter, let's add the sublayer
                if( firstCustom ) {
                    firstCustom = false;

                    icons += "\n";
                    icons += "        # examples of different icons mapped to feature properties\n";
                    icons += "        icons:\n";
                }

                // Assuming the icon sublayer already exists, let's add new sublayers for this filter
                icons += "            "+name+":\n";
                if( output[i]["zoom_filter"] != '-1' )
                {
                    icons += "                filter: { kind: ["+output[i]["filter"]+"], $zoom: "+output[i]["zoom_filter"]+" }\n"
                } else {
                    icons += "                filter: { kind: ["+output[i]["filter"]+"] }\n"
                }
                icons += "                draw:   { icons: { sprite: "+name+" } }\n"
            }
       }

       shields_src.sort( sortAlpha );
       shields_dedup = [];
       var new_shield_boolean = true;
       var new_shield = '';
       for (var j = 0; j < shields_src.length; j++)
       {
           new_shield_boolean = true;
           for (var k = 0; k < shields_dedup.length; k++)
           {
                if( shields_src[j] == shields_dedup[k] ) {
                    new_shield_boolean = false;
                    break;
                } else {
                    new_shield = shields_src[j];
                }
           }
           if( new_shield_boolean ) {
                shields_dedup.push( new_shield );
           }
        }
       
       for (var j = 0; j < shields_dedup.length; j++)
       {
            if( j > 1) {
                shields += ", ";
            }
            shields += shields_dedup[j];
        }

       shields += "] }"

       var combined_textures_icons = textures + "\n\n" + styles + "\n\n" + icons;

       if( app.activeDocument.name.indexOf('shield') > 0 ) {
            combined_textures_icons += "\n\n" + shields;
       }
       
       outputFile.write( combined_textures_icons );
       outputFile.close();
}

// sort alphabetically on feature name
function sortAlpha(a,b) {
    if (a.name < b.name)
    {
        return -1;
    }
    if (a.name > b.name)
    {
        return 1;
    }

    return 0;
}

function stripCharCount( name ) {
    if(name.indexOf("char") > 0 && name.length > 2 ) {
        name = name.substring(0,[name.indexOf("char")-2]);
    }

    if( name[0] ==  "'" ) {
        name += "'";
    }
    return name;
}

// write html output file
function writeHTML() {
    var filePath = folderPath+"/"+OUTPUT_FILENAME+".html";
    var outputFile =new File(filePath);
    var finalOutput = "";

    outputFile.open('w');

    var name1 =  output[0]["name"];
    var name2 =  output[1]["name"];
    var x = output[1]["x"];
    var y = output[1]["y"];
    var width = output[1]["width"];
    var height = output[1]["height"];

    var hitX1 = output[0]["hitX"];
    var hitY1 = output[0]["hitY"];
    var hitWidth1 = output[0]["hitWidth"];
    var hitHeight1 = output[0]["hitHeight"];
    var hitX2 = output[1]["hitX"];
    var hitY2 = output[1]["hitY"];
    var hitWidth2 = output[1]["hitWidth"];
    var hitHeight2 = output[1]["hitHeight"];

    var js  = "var sprite=document.getElementById('sprite-demo');";
        js += "var hitArea=document.getElementById('hit-area');";
        js += "sprite.classList.remove('"+name1+"');";
        js += "sprite.classList.add('"+name2+"');";
        js += "sprite.style.width='"+width+"px';";
        js += "sprite.style.height='"+height+"px';";
        js += "hitArea.style.left='"+(hitX2+(x*-1))+"px';";
        js += "hitArea.style.top='"+(hitY2+(y*-1))+"px';";
        js += "hitArea.style.width='"+hitWidth2+"px';";
        js += "hitArea.style.height='"+hitHeight2+"px';";


    var css = "left:"+hitX1+"px; top:"+hitY1+"px; width:"+hitWidth1+"px; height:"+hitHeight1+"px; position:absolute; outline:1px solid red;";

    var html = "<!doctype html>\n";
        html += "<html>";
        html += "<head>"
        html += "<title>AI Spritesheet Factory Test</title>";
        html += "<link href='"+OUTPUT_FILENAME+".css' rel='stylesheet' >";
        html += "</head>";
        html += "<body>";
        html += "<h1>Click the red outlined hit area to test transition </h1><p>(<strong>Note</strong>: only works for transition from 1<sup>st</sup> to 2<sup>nd</sup> sprite. Sprites also need to be at least two wide on sheet)</p>";
        html += "<div id='sprite-demo' class='"+name1+"' style='position:relative;'><div id='hit-area' onClick=\""+js+"\" style=\""+css+"\"></div></div>";
        html += "<p><a href='https://github.com/anselmbradford/ai-spritesheet-factory'>Go to Github Repository...</a></p>";
        html += "</div>";
        html += "</body>";
        html += "</html>";

    outputFile.write( html );
    outputFile.close();
}


// write the parameter output file
function writeParameters() {
    var filePath = folderPath+"/"+OUTPUT_FILENAME+"."+PARAM_TYPE;
    var outputFile =new File(filePath);
    var finalOutput = "";

    outputFile.open('w');

    for (var i = 0; i < output.length; i++)
    {
        var format = PARAM_FORMAT;
        var name =  output[i]["name"];
        var x = output[i]["x"];
        var y = output[i]["y"];
        var width = output[i]["width"];
        var height = output[i]["height"];
        var hitX = output[i]["hitX"];
        var hitY = output[i]["hitY"];
        var hitWidth = output[i]["hitWidth"];
        var hitHeight = output[i]["hitHeight"];

        var search = ROOT_LAYER;
        var regex = new RegExp(search, 'g');
        format = format.replace(regex, name);

        search = (name+"x_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, x);

        search = (name+"y_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, y);

        search = (name+"width_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, width);

        search = (name+"height_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, height);

        search = (name+"hit_x_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, hitX);

        search = (name+"hit_y_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, hitY);

        search = (name+"hit_width_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, hitWidth);

        search = (name+"hit_height_value");
        regex = new RegExp(search, 'g');
        format = format.replace(regex, hitHeight);

        // remove extraneous sprite names
        search = name;
        regex = new RegExp(search, 'g');
        format = format.replace(regex, "");

        // add back first sprite name
        if (PARAM_TYPE == "json")
        {
            format = format.substring(2,format.length);
            format = '"'+name+'"'+format;
            if ( i != output.length-1) format += ",";
        }


        finalOutput += "    "+format+"\n";
    }
    if (PARAM_TYPE == "json") finalOutput = "{\n"+finalOutput+"}";

    outputFile.write( finalOutput );
    outputFile.close();
}

function createDefaultConfig() {
    var contents  = '# Maximum width of the sprite sheet\n';
        contents += 'max_width : 500\n\r';
        contents += '# Horizontal gap between sprites\n';
        contents += 'x_gap : 24\n\r';
        contents += '# Vertical gap between sprites\n';
        contents += 'y_gap : 24\n\r';
        contents += '# Common badge size\n\r';
        contents += 'common_badge_size : 36\n\r';
        contents += '# root layer name to use as sprite area\n';
        contents += 'root_layer_prefix : sprite_\n\r';
        contents += '# root layer name to use as sprite area\n';
        contents += 'skip_layer_prefix : ~\n\r';
        contents += '# layer name of layout area\n';
        contents += 'area_layer_prefix : area_\n\r';
        contents += '# layer name of hit area\n';
        contents += 'hit_layer_prefix : hit_\n\r';
        contents += '# layer name of filter area\n';
        contents += 'filter_layer_prefix : filter_\n\r';
        contents += '# layer name of zoom filter\n';
        contents += '# Implied that "zoom: " on interpretation in the JSX\n';
        contents += 'zoom_filter_layer_prefix : zoom\n\r';
        contents += '# export area (badge) layer (accepts "true" or "false")\n';
        contents += 'export_area_layer : false\n\r';
        contents += '# export filetype (accepts "png24", "png8", or "jpg")\n';
        contents += 'export_area_layer : false\n\r';
        contents += '# export as black and white mask (accepts "true" or "false")\n';
        contents += 'export_as_black_and_white_mask : false\n\r';
        contents += '# export as grey mask (accepts "true" or "false")\n';
        contents += 'export_as_grey_mask : false\n\r';
        contents += '# export filetype (accepts "png24", "png8", or "jpg")\n';
        contents += 'export_format : png24\n\r';
        contents += '# export resolution (1, 2, 3)\n';
        contents += 'export_resolution : 1\n';
        contents += '# quality of jpg export (accepts 0-100)\n';
        contents += 'jpg_quality : 30\n\r';
        contents += '# output file name\n';
        contents += 'output_filename : sprites\n\r';
        contents += '# whether to generate HTML (accepts "true" or "false")\n';
        contents += 'generate_html : true\n\r';
        contents += '# whether to generate CSS (accepts "true" or "false")\n';
        contents += 'generate_css : true\n\r';
        contents += "# should we assume the sprite name is the filter name? If so, don't export filters except when custom\n";
        contents += 'generate_css_using_filter_auto_lookup : false\n\r';
        contents += '# whether to generate parameters (accepts "true" or "false")\n';
        contents += 'generate_param : true\n\r';
        contents += '# output format. This is a single entry in the output file script. Script will search for prefixes (from above)';
        contents += 'and inject full layer name and associated value\n';
        contents += '# prefixes here MUST match above sprite and hit area layer prefixes!\n';
        contents += 'param_format : "sprite_":{"sprite_x":"sprite_x_value","sprite_y":"sprite_y_value","sprite_width":"sprite_width_value","sprite_height":"sprite_height_value",';
        contents += '"sprite_hit_x":"sprite_hit_x_value","sprite_hit_y":"sprite_hit_y_value","sprite_hit_width":"sprite_hit_width_value","sprite_hit_height":"sprite_hit_height_value"}\n\r';
        contents += '# type of parameter data (accepts "json") # TODO add "xml", "array"\n';
        contents += 'param_type : json\n\r';
        contents += 'move_sprites_to_new_grid : false\n';
        contents += '# move sprites into compact sprite sheet grid before export\n\r';
        contents += '# preserve new grid layout after export\n';
        contents += 'preserve_grid : false\n\r';

    var outputFile = new File(filePath);

    outputFile.open('w');
    outputFile.write(contents);
    outputFile.close();
}
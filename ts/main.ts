require("module-alias/register");
const argv = require("optimist").default({ PositionType: "abs" }).argv;
import GridScaler from "./gridscalerts";
import { WriteOutputFile, CSSGenerator, HTMLGenerator } from "@generators/index";
import ZipHandler from "@helpers/ziphandler";
import PowerpointElementParser from "./parsers/elementparser";
import * as ShapeRenderers from "@renderers/index";
import { SpecialityType } from "@models/pptelement";
import { PositionType } from "@models/css";
import { BuildOptions } from "@models/options";

GenerateUI();

export default function GenerateUI() {
	console.log(argv);
	let config: BuildOptions = {
		PositionType: "abs",
		powerpointFileName: "../TeluguApp.pptx"
	};

	if (config.PositionType === "abs") {
	} else if (config.PositionType === "grid") {
	} else {
		throw Error("Invalid element positioning type in arguements");
	}

	//do some stuff based on the
	loadZip(config);
}

async function loadZip(config: BuildOptions) {
	await ZipHandler.loadZip(config.powerpointFileName);
	let slideShowGlobals = await ZipHandler.parseSlideAttributes("ppt/presentation.xml");
	let slideShowTheme = await ZipHandler.parseSlideAttributes("ppt/theme/theme1.xml");

	let slideSizeX = slideShowGlobals["p:presentation"]["p:sldSz"][0]["$"]["cx"];
	let slideSizeY = slideShowGlobals["p:presentation"]["p:sldSz"][0]["$"]["cy"];

	//Place elements in right position for HTML
	let slideAttributes = await ZipHandler.parseSlideAttributes("ppt/slides/slide5.xml");
	let slideRelations = await ZipHandler.parseSlideAttributes("ppt/slides/_rels/slide5.xml.rels"); //contains references to links,images and etc.
	console.log(JSON.stringify(slideAttributes));

	//Parse ppt/presentation.xml and get size
	let scaler = new GridScaler(slideSizeX, slideSizeY, 12);
	let htmlGen = new HTMLGenerator(PositionType.Absolute);
	let pptElementParser = new PowerpointElementParser(slideShowGlobals, slideShowTheme, slideRelations);

	let slideShapes = slideAttributes["p:sld"]["p:cSld"][0]["p:spTree"][0]["p:sp"];
	let slideImages = slideAttributes["p:sld"]["p:cSld"][0]["p:spTree"][0]["p:pic"];

	let slideElements = slideShapes.concat(slideImages);
	let elementsCSS = [];

	for (let element of slideElements) {
		//parse element body
		let pptElement = pptElementParser.getProcessedElement(element);
		if (pptElement) {
			console.log(pptElement);
			let rendererType = pptElement.specialityType == SpecialityType.None ? pptElement.shapeType : pptElement.specialityType; //override with speciality choice
			console.log(rendererType);
			//Convert PPT shapes
			let renderedElement = new ShapeRenderers[rendererType](scaler, pptElement, slideShowGlobals, slideShowTheme, PositionType.Absolute);
			let elementCSS = renderedElement.getCSS();
			let html = renderedElement.render();

			//add HTML and CSS to files
			elementsCSS.push(elementCSS);
			htmlGen.addElementToDOM(html);
		}
	}

	//Create Output HTML file
	WriteOutputFile("abs.css", CSSGenerator.generateCSS(PositionType.Absolute, elementsCSS));
	WriteOutputFile("grid.css", CSSGenerator.generateCSS(PositionType.Grid, elementsCSS));
	WriteOutputFile("index.html", htmlGen.getGeneratedHTML());
}

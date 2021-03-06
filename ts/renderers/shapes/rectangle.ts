import { PowerpointElement, LinkType, FillType } from "@models/pptelement";
import ElementRenderer from "@renderers/renderer";
import GridScaler from "gridscalerts";
import * as format from "string-template";
import { PositionType } from "@models/css";
import GenerateParagraphCSS from "../helpers/paragraph";
import copyAssetToOutputDirectory from "../helpers/assetMover";
import GenerateBorderCSS from "@renderers/helpers/border";
/**
 * Takes in an element and it's attributes to generate a rectangle and places elements in correct place. The scaler can help you convert heights and widths.
 * Raw GlobalXML values are passed in for reference such as theme.xml and presentation.xml
 */
export default class Rectangle extends ElementRenderer {
	//NOTE: We don't have to worry about positioning, our scaler and the base class takes care of that for us
	constructor(scaler: GridScaler, element: PowerpointElement, rawSlideShowGlobals, rawSlideShowTheme, PositionType: PositionType) {
		super(scaler, element, rawSlideShowGlobals, rawSlideShowTheme, PositionType);

		let css = format(
			`#{name}.shape{
			width:{width}px;
			height:{height}px;  
			background: {background}; 
			display: table;
            }`,
			{
				name: element.name,
				width: scaler.getScaledValue(element.elementOffsetPosition.cx),
				height: scaler.getScaledValue(element.elementOffsetPosition.cy),
				background: this.determineBackground()
			}
		);

		//stylize text in this element with a generic paragraph helper, may or may not work on all shapes
		if (element.paragraph) {
			let fontCSS = GenerateParagraphCSS(element.paragraph, element.name);
			this.addCSSAttribute(fontCSS);
		}

		if (element.shape.border) {
			let borderCSS = GenerateBorderCSS(element.shape.border, element.name);
			this.addCSSAttribute(borderCSS);
		}
		this.addCSSAttribute(css);
	}

	render(): string {
		//NOTE: I'm using JQUERY to build my dom, but you can return html however you want

		let shapeDiv = format(
			`<div id="{0}" class="{1}">
				<a style="height:100%;display:block;"> </a>
			</div>`,
			this.element.name,
			"position shape border"
		);
		this.$("body").append(shapeDiv); //add the shapediv initially

		if (this.element.links) {
			if (this.element.links.Type == LinkType.External) {
				this.$("#" + this.element.name + " > a").attr("href", this.element.links.Uri);
			}
		}

		if (this.element.paragraph) {
			let paragraphHTML = format('<p class="font">{0}</p>', this.element.paragraph.text);
			this.$("#" + this.element.name).append(paragraphHTML); //add the paragraph div within t
		}

		return this.$("#" + this.element.name)[0].outerHTML;
	}

	determineBackground(): string {
		if (this.element.shape.opacity == 0) {
			return "transparent";
		}

		let fillDetails = this.element.shape.fill;
		if (fillDetails.fillType == FillType.Solid) {
			return "#" + this.element.shape.fill.fillColor;
		}

		if (fillDetails.fillType == FillType.Image) {
			copyAssetToOutputDirectory(fillDetails.fillColor, true);
			//change tiff references to pngs
			let imagePath = this.getOutputImagePath(fillDetails.fillColor);
			console.log("GOT Imagepath as ", imagePath);
			return format("url({0})", imagePath);
		}

		return "transparent";
	}
}

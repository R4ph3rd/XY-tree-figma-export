// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many shapes and connectors on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

figma.showUI(__html__, { width: 300, height: 200 });

figma.ui.onmessage = async (msg) => {
    console.log(msg)
    if (msg.type === 'export-json' || msg.type == 'export-html') {
        const selectedNode = figma.currentPage.selection[0];

        if (!selectedNode) {
            figma.notify("Please select a node to export!");
            return;
        }

        const tree = buildTree(selectedNode, selectedNode.absoluteTransform);

        if (msg.type === "export-html") {
            figma.ui.postMessage({type: 'html', content: generateHTML(tree)});
        } else if (msg.type === "export-json") {
            figma.ui.postMessage({type: 'json', content: JSON.stringify(tree)});
        }
};

function buildTree(node: any, parentTransform: any): any {
    const { width, height } = node;
    const absoluteX = node.absoluteTransform[0][2];
    const absoluteY = node.absoluteTransform[1][2];
    const parentX = parentTransform[0][2];
    const parentY = parentTransform[1][2];

    const relativeX = absoluteX - parentX;
    const relativeY = absoluteY - parentY;

    const treeNode = {
        name:  setLeaf(node),
        width: width || 0,
        height: height || 0,
        top: relativeY,
        left: relativeX,
        children: [] as any[],
    };

    if ("children" in node) {
        node.children.forEach((child: any) => {
            treeNode.children.push(buildTree(child, node.absoluteTransform));
        });
    }

    if (treeNode.children.length == 0){
        delete treeNode.children;
    }

    return treeNode;
}

function setLeaf(node:any): any{
    const color = getStrokeHexColor(node);

    if (color == '#21FD28') return 'Image';
    if (color == '#FD2124') return 'Text';
    if (color == '#21D1FD') return 'Leaf';
    return 'Leaf';
}

function getStrokeHexColor(node: any): string | null {
    if ("strokes" in node && node.strokes.length > 0) {
        const stroke = node.strokes[0]; // Get the first stroke
        if (stroke.type === "SOLID") {
            const color = stroke.color;
            const r = Math.round(color.r * 255);
            const g = Math.round(color.g * 255);
            const b = Math.round(color.b * 255);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        }
    }
    return null; // No stroke or unsupported type
}

function generateHTML(tree: any): string {
    const createElement = (node: any): string => {
        const style = `style="position: relative; top: ${node.top}px; left: ${node.left}px; width: ${node.width}px; height: ${node.height}px;"`;

        let childrenHTML = '';
        if (node.children){
            childrenHTML = node.children.map((child: any) => createElement(child)).join('');
        }

        return `<div data-name="${node.name}" ${style}>${childrenHTML}</div>`;
    };
    return createElement(tree);
}

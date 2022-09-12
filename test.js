// DISCLAIMER: I coded this on an iPhone. Please don't judge this code too hard :D

const fs = FileManager.iCloud();
const draw = new DrawContext();

// Top level globals
const DEBUG = false;
const CACHE_DIR = fs.joinPath(fs.documentsDirectory(), "menuCache");


const FIRST_RUN = !(fs.fileExists(fs.joinPath(CACHE_DIR, "cafe.png")) &&
                    fs.fileExists(fs.joinPath(CACHE_DIR, "west.png")));
  
const CAFE_IMG_URL = "https://raw.githubusercontent.com/zackheil/work-menus/master/cafe.png";
const WEST_IMG_URL = "https://raw.githubusercontent.com/zackheil/work-menus/master/west.png";


const MENU_ARG = String(args.widgetParameter).toLowerCase() === "null" ? 
                 'cafe' : String(args.widgetParameter).toLowerCase();
const API_BASE_URL = "https://api2.online-convert.com";
const API_KEY = "GET UR OWN";
const BG_IMG = fs.readImage(fs.joinPath(CACHE_DIR, `${MENU_ARG}.png`));



main();







function main() {
  // Cold Start
  if(FIRST_RUN) {
    fetchWidgetAssets()
  }
  refreshAssets();
  
  // Get Menu
//   const menu = getMenu(MENU_ARG);
  
  // Execute
  if(config.runsInWidget || DEBUG) {
    displayWidget(MENU_ARG)
  }
  else {
    openSite(MENU_ARG)
  }
  
  
  
  Script.complete()
}

// Utility methods

async function fetchWidgetAssets() {
  // Create the cache directory
  if(!fs.fileExists(CACHE_DIR)) {
    fs.createDirectory(CACHE_DIR)
  }
  
  // Download widget background images and store in cache directory
  try {
    if(!fs.fileExists(fs.joinPath(CACHE_DIR, "cafe.png"))) {
      let cafe = await new Request(CAFE_IMG_URL).loadImage();
      cafe = Data.fromPNG(cafe);
      fs.write(fs.joinPath(CACHE_DIR, "cafe.png"), cafe);
    }
    
    if(!fs.fileExists(fs.joinPath(CACHE_DIR, "west.png"))) {
      let west = await new Request(WEST_IMG_URL).loadImage();
      west = Data.fromPNG(west);
      fs.write(fs.joinPath(CACHE_DIR, "west.png"), west);
    }
  } 
  catch(e) {
    console.error(e)
  }
}

function refreshAssets() {
  const cafePath = fs.joinPath(CACHE_DIR, "cafe.png");
  const westPath = fs.joinPath(CACHE_DIR, "west.png");
  
  if(!fs.isFileDownloaded(cafePath)) { fs.downloadFileFromiCloud(cafePath) }
  if(!fs.isFileDownloaded(westPath)) { fs.downloadFileFromiCloud(westPath) }
}

function displayWidget(menu) {
  let widget = new ListWidget();
  widget.setPadding(0, 0, 0, 0);
  widget.backgroundImage = BG_IMG; 
  widget.presentLarge()
}

async function openSite(menu) {
  const url = await getMenuURL(menu);
  console.log(`opening ${url}`);
  Safari.openInApp(url.replaceAll(" ", "%20"), true);
}

async function getMenuURL(menu) {
  const baseURL = 'https://eurestcafes.compass-usa.com/koch/Pages/Menu.aspx?lid='
  const restaurant = { cafe: 'b1', west: 'a1' };
  
  let txt = await new Request(baseURL + restaurant[menu]).loadString()
  let pdfurl = txt.split(/src=\"([^\"]+\.pdf)\"/gm)[1] //.replace(" ", "%20");
  return pdfurl;
}

async function getMenu(menu) {
  const prefix = {common: 'menu-', cafe: 'cafe-', west: 'west-' }
  
  d = new Date();
  const today = d.getDate();
  const dayOfTheWeek = d.getDay();
  d.setHours(0);	d.setMinutes(0); d.setSeconds(0); d.setDate(today - dayOfTheWeek);
  const thisWeekUNIX = Number(String(d.getTime()).substr(0,8) + "00000");
  

  // If the menu doesn't exist for this week, get a new one
  if(!fs.fileExists(fs.joinPath(CACHE_DIR, `${prefix.common}${prefix[menu]}`))) {
    
    let jobID = await dispatchPDFJob(menu);
    console.log(jobID)
    let txtFileUrl = await getOutFileUrl(jobID);
    console.log(txtFileUrl)
    let txtFile = await getTxtFile(txtFileUrl);
  }
}


async function dispatchPDFJob(menu) {
  console.log("here we go");
  
  return "a03e741b-0045-4ed8-8afb-370dc5258000";
  
  let menuPDFURL = await getMenuURL(menu);
    
  let req = new Request(API_BASE_URL + '/jobs');
  req.headers = { ['x-oc-api-key']: API_KEY }
  req.body = JSON.stringify({
    input: [{
      type: "remote",
      source: menuPDFURL
    }],
    conversion: [{
      target: "txt"
    }]
  });
  req.method = 'POST'
    
  let res = await req.loadJSON();
  //console.log(res)
  let jobID = res.id;
  console.log(jobID)
  return jobID
}


async function getOutFileUrl(jobID) {
  let req = new Request(API_BASE_URL + '/jobs/' + jobID);
  req.headers = { ['x-oc-api-key']: API_KEY };
  req.method = 'GET';
  let res = await req.loadJSON();
  // console.log(res);
  let fileURL = res.output[0].uri;
  console.log(fileURL);
  return fileURL;
}

async function getTxtFile(fileURL) {
  let req = new Request(fileURL);
  req.headers = { ['x-oc-api-key']: API_KEY };
  req.method = 'GET';
  let res = await req.loadString();
  console.log(res);
}

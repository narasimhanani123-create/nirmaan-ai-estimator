const GEMINI_API_KEY = "AIzaSyAVR5kTj5vm8NsQLLkV-uGTIp7bXN2CL3Y";
const _syslang = navigator.language || navigator.userLanguage || "te";
let currentLang = localStorage.getItem("appLang") || (_syslang.startsWith("hi") ? "hi" : _syslang.startsWith("te") ? "te" : "en");
let currentStep = 1;
let floors = 1;
let currentUnit = "sqft";
let selectedFeatures = [];

const rates = {
  economy:  { min: 1400, max: 1800, mid: 1600 },
  standard: { min: 1800, max: 2400, mid: 2100 },
  premium:  { min: 2400, max: 3200, mid: 2800 },
  luxury:   { min: 3200, max: 4500, mid: 3850 },
};

const districtMultiplier = {
  gadwal:0.88,hyderabad:1.20,warangal:0.95,nizamabad:0.92,
  karimnagar:0.93,khammam:0.94,nalgonda:0.91,mahbubnagar:0.90,
  other_ts:0.93,other:1.00,
};

const featureCosts = {
  basement:8,lift:12,solar:3,rainwater:1.5,
  cctv:1,intercom:0.8,vastu:0.5,parking:2,
};

const breakdown = {
  foundation:{te:"పునాది",en:"Foundation",hi:"नींव",pct:15},
  structure:{te:"స్ట్రక్చర్",en:"Structure",hi:"संरचना",pct:25},
  brickwork:{te:"ఇటుక పని",en:"Brickwork",hi:"ईंट का काम",pct:12},
  roofing:{te:"పై కప్పు",en:"Roofing",hi:"छत",pct:10},
  plumbing:{te:"ప్లంబింగ్",en:"Plumbing",hi:"प्लंबिंग",pct:8},
  electrical:{te:"ఎలక్ట్రికల్",en:"Electrical",hi:"बिजली",pct:7},
  flooring:{te:"ఫ్లోరింగ్",en:"Flooring",hi:"फर्श",pct:8},
  finishing:{te:"ఫినిషింగ్",en:"Finishing",hi:"फिनिशिंग",pct:15},
};

window.addEventListener("load", () => {
  applyLanguage();
  setTimeout(() => {
    const splash = document.getElementById("splash");
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
      document.getElementById("app").classList.remove("hidden");
      loadSavedEstimates();
    }, 300);
  }, 800);
});

function applyLanguage() {
  const labelMap = {te:"తె",en:"EN",hi:"हि"};
  const el = document.getElementById("langLabel");
  if(el) el.textContent = labelMap[currentLang];
  updateAllLabels();
  updateChips();
  updateAppName();
  updateFooter();
}

function cycleLang() {
  const langs = ["te","en","hi"];
  const idx = langs.indexOf(currentLang);
  currentLang = langs[(idx+1) % langs.length];
  localStorage.setItem("appLang", currentLang);
  location.reload();
}

function updateAppName() {
  const subs = {te:"నిర్మాణ వ్యయ అంచనా",en:"Construction Cost Estimator",hi:"निर्माण लागत अनुमानक"};
  const el = document.querySelector(".app-sub");
  document.querySelector(".app-title").textContent = "Nirmaan AI";
  if(el) el.textContent = subs[currentLang];
}

function updateFooter() {
  const texts = {
    te:"నిర్మాణ్ AI • Telugu Contractors కోసం 🏗️",
    en:"Nirmaan AI • Made for Indian Contractors 🏗️",
    hi:"निर्माण AI • भारतीय ठेकेदारों के लिए 🏗️",
  };
  const f = document.querySelector(".footer p");
  if(f) f.textContent = texts[currentLang];
}

function updateAllLabels() {
  document.querySelectorAll("[data-te]").forEach(el => {
    const val = el.getAttribute("data-"+currentLang) || el.getAttribute("data-te");
    if(el.tagName!=="INPUT"&&el.tagName!=="SELECT"&&el.tagName!=="TEXTAREA"){
      el.textContent = val;
    }
  });
}

function updateChips() {
  document.querySelectorAll(".chip").forEach(el => {
    const val = el.getAttribute("data-"+currentLang);
    if(val) el.textContent = val;
  });
  document.querySelectorAll(".btn-next,.btn-back").forEach(el => {
    const val = el.getAttribute("data-"+currentLang);
    if(val) el.textContent = val;
  });
  document.querySelectorAll(".feature-item span[data-te]").forEach(el => {
    const val = el.getAttribute("data-"+currentLang);
    if(val) el.textContent = val;
  });
}

function selectChip(el, groupId) {
  document.querySelectorAll("#"+groupId+" .chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
}

function selectGrade(el) {
  document.querySelectorAll(".grade-card").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
}

function setUnit(unit) {
  currentUnit = unit;
  document.querySelectorAll(".unit-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("btn-"+unit).classList.add("active");
  const m = {
    sqft:{label:"బిల్డప్ ఏరియా (Sq.Ft)",tag:"sq.ft"},
    sqyd:{label:"బిల్డప్ ఏరియా (Sq.Yd)",tag:"sq.yd"},
    gunta:{label:"బిల్డప్ ఏరియా (గుంట)",tag:"గుంట"},
  };
  document.getElementById("areaLabel").textContent = m[unit].label;
  document.getElementById("unitTag").textContent = m[unit].tag;
}

function changeFloors(delta) {
  floors = Math.max(1, Math.min(10, floors+delta));
  document.getElementById("floorsCount").textContent = floors;
}

function updateFeatures() {
  selectedFeatures = [];
  document.querySelectorAll("#featuresGrid input:checked").forEach(cb => {
    selectedFeatures.push(cb.value);
  });
}

function goToStep(step) {
  if(step > currentStep && !validateStep(currentStep)) return;
  for(let i=1;i<=4;i++){
    document.getElementById("section-"+i).classList.add("hidden");
    const dot = document.getElementById("step-dot-"+i);
    dot.classList.remove("active","done");
    dot.textContent = i;
  }
  for(let i=1;i<step;i++){
    const dot = document.getElementById("step-dot-"+i);
    dot.classList.add("done");
    dot.textContent = "✓";
  }
  document.getElementById("section-"+step).classList.remove("hidden");
  document.getElementById("step-dot-"+step).classList.add("active");
  currentStep = step;
  window.scrollTo({top:0,behavior:"smooth"});
  if(step===4) calculateEstimate();
}

function validateStep(step) {
  if(step===1){
    if(!document.getElementById("ownerName").value.trim()){
      alert(currentLang==="hi"?"मालिक का नाम दर्ज करें!":currentLang==="en"?"Enter owner name!":"యజమాని పేరు enter చేయండి!");
      return false;
    }
  }
  if(step===2){
    const area = document.getElementById("builtupArea").value;
    if(!area||area<=0){
      alert(currentLang==="hi"?"क्षेत्रफल दर्ज करें!":currentLang==="en"?"Enter valid area!":"ఏరియా enter చేయండి!");
      return false;
    }
  }
  return true;
}

async function calculateEstimate() {
  document.getElementById("estimateLoading").classList.remove("hidden");
  document.getElementById("estimateResult").classList.add("hidden");

  const ownerName = document.getElementById("ownerName").value.trim();
  const typeEl = document.querySelector("#constructionType .chip.active");
  const gradeEl = document.querySelector(".grade-card.active");
  const district = document.getElementById("district").value;
  const extraNotes = document.getElementById("extraNotes").value.trim();
  const constructionType = typeEl ? typeEl.dataset.value : "residential";
  const grade = gradeEl ? gradeEl.dataset.value : "economy";
let customRateVal = 0;
if(grade === "custom") {
  customRateVal = parseFloat(document.getElementById("customRate").value) || 1800;
}
  let areaSqft = parseFloat(document.getElementById("builtupArea").value)||0;
  if(currentUnit==="sqyd") areaSqft *= 9;
  if(currentUnit==="gunta") areaSqft *= 1089;

  const totalArea = areaSqft * floors;
 const rate = grade==="custom" ? {min:customRateVal*0.9,max:customRateVal*1.1,mid:customRateVal} : (rates[grade]||rates.economy);
  const mult = districtMultiplier[district]||1.0;
  let baseCost = totalArea*(grade==="custom"?customRateVal:rate.mid)*mult;
  let featureAddOn = 0;
  selectedFeatures.forEach(f => { featureAddOn += (featureCosts[f]||0)*100000; });

  const totalCost = baseCost + featureAddOn;
  const minCost = (totalArea*rate.min*mult)+featureAddOn;
  const maxCost = (totalArea*rate.max*mult)+featureAddOn;

  document.getElementById("totalCost").textContent = formatCurrency(totalCost);
  document.getElementById("costRange").textContent = formatCurrency(minCost)+" – "+formatCurrency(maxCost);

  renderBreakdown(totalCost);

  if(selectedFeatures.includes("vastu")){
    document.getElementById("vastuBox").classList.remove("hidden");
    document.getElementById("vastuText").textContent = getVastuTips(constructionType);
  }

  await getAIAdvice(ownerName,constructionType,grade,totalArea,totalCost,district,extraNotes);

  document.getElementById("estimateLoading").classList.add("hidden");
  document.getElementById("estimateResult").classList.remove("hidden");
  saveToMemory(ownerName,totalCost,grade,totalArea,district);
}

function formatCurrency(amount) {
  if(amount>=10000000) return "₹"+(amount/10000000).toFixed(2)+" కోట్లు";
  if(amount>=100000) return "₹"+(amount/100000).toFixed(2)+" లక్షలు";
  return "₹"+Math.round(amount).toLocaleString("en-IN");
}

function renderBreakdown(total) {
  const grid = document.getElementById("breakdownGrid");
  grid.innerHTML = "";
  Object.entries(breakdown).forEach(([key,val]) => {
    const amount = (total*val.pct)/100;
    const label = val[currentLang]||val.te;
    grid.innerHTML += '<div class="breakdown-item"><div class="breakdown-label">'+label+'</div><div class="breakdown-value">'+formatCurrency(amount)+'</div><div class="breakdown-pct">'+val.pct+'%</div></div>';
  });
}

function getVastuTips(type) {
  const tips = {
    te:{residential:"🕉️ ముఖద్వారం తూర్పు లేదా ఉత్తరం వైపు ఉండాలి. వంటగది ఆగ్నేయంలో ఉంచండి.",commercial:"🕉️ ముఖద్వారం తూర్పు వైపు పెట్టండి. Cash counter ఉత్తరం వైపు ఉంచండి."},
    en:{residential:"🕉️ Main entrance should face East or North. Kitchen in Southeast.",commercial:"🕉️ Main entrance facing East. Cash counter in North direction."},
    hi:{residential:"🕉️ मुख्य द्वार पूर्व या उत्तर की ओर होना चाहिए। रसोई दक्षिण-पूर्व में।",commercial:"🕉️ मुख्य द्वार पूर्व की ओर। कैश काउंटर उत्तर दिशा में।"},
  };
  return (tips[currentLang]&&tips[currentLang][type])||tips.te.residential;
}

async function getAIAdvice(name,type,grade,area,cost,district,notes) {
  const langName = currentLang==="te"?"Telugu":currentLang==="hi"?"Hindi":"English";
  const prompt = "You are a friendly Indian construction consultant. Give advice in "+langName+" only. Under 80 words. Owner: "+name+", Type: "+type+", Grade: "+grade+", Area: "+area+" sqft, Cost: "+formatCurrency(cost)+", Location: "+district+". Give 2-3 money-saving tips and one encouraging line.";
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="+GEMINI_API_KEY,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text||defaultAdvice();
    document.getElementById("aiAdviceText").textContent = text;
  } catch(e) {
    document.getElementById("aiAdviceText").textContent = defaultAdvice();
  }
}

function defaultAdvice() {
  const a = {
    te:"మీ నిర్మాణ ప్రాజెక్ట్ కి శుభాకాంక్షలు! 🏗️ మంచి contractor ని ఎంచుకోండి. Budget లో 10% emergency fund ఉంచండి.",
    en:"Best wishes for your project! 🏗️ Choose a reliable contractor and keep 10% as emergency fund.",
    hi:"आपके प्रोजेक्ट के लिए शुभकामनाएं! 🏗️ अच्छे ठेकेदार चुनें, 10% आपातकालीन फंड रखें।",
  };
  return a[currentLang]||a.te;
}

function shareWhatsApp() {
  const name = document.getElementById("ownerName").value;
  const cost = document.getElementById("totalCost").textContent;
  const range = document.getElementById("costRange").textContent;
  const area = document.getElementById("builtupArea").value;
  const district = document.getElementById("district").value;
  const msgs = {
    te:"🏗️ *నిర్మాణ్ AI - Cost Estimate*\n\n👤 యజమాని: "+name+"\n📍 లొకేషన్: "+district+"\n📐 ఏరియా: "+area+" "+currentUnit+"\n💰 అంచనా: *"+cost+"*\n📊 Range: "+range+"\n\n_నిర్మాణ్ AI తో generate చేయబడింది_ 🤖",
    en:"🏗️ *Nirmaan AI - Cost Estimate*\n\n👤 Owner: "+name+"\n📍 Location: "+district+"\n📐 Area: "+area+" "+currentUnit+"\n💰 Estimate: *"+cost+"*\n📊 Range: "+range+"\n\n_Generated by Nirmaan AI_ 🤖",
    hi:"🏗️ *निर्माण AI - लागत अनुमान*\n\n👤 मालिक: "+name+"\n📍 स्थान: "+district+"\n📐 क्षेत्र: "+area+" "+currentUnit+"\n💰 अनुमान: *"+cost+"*\n📊 रेंज: "+range+"\n\n_निर्माण AI द्वारा तैयार_ 🤖",
  };
  window.open("https://wa.me/?text="+encodeURIComponent(msgs[currentLang]),"_blank");
}

function saveToMemory(name,cost,grade,area,district) {
  const estimates = JSON.parse(localStorage.getItem("estimates")||"[]");
  estimates.unshift({id:Date.now(),name,cost,grade,area,district,date:new Date().toLocaleDateString("en-IN")});
  if(estimates.length>10) estimates.pop();
  localStorage.setItem("estimates",JSON.stringify(estimates));
}

function saveEstimate() {
  const name = document.getElementById("ownerName").value;
  alert(currentLang==="hi"?"✅ \""+name+"\" सेव हो गया!":currentLang==="en"?"✅ \""+name+"\" saved!":"✅ \""+name+"\" save అయింది!");
  loadSavedEstimates();
}

function loadSavedEstimates() {
  const estimates = JSON.parse(localStorage.getItem("estimates")||"[]");
  const list = document.getElementById("savedList");
  const empty = currentLang==="hi"?"अभी तक कोई अनुमान सेव नहीं":currentLang==="en"?"No estimates saved yet":"ఇంకా ఏ estimate save చేయలేదు";
  if(estimates.length===0){
    list.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px">'+empty+'</p>';
    return;
  }
  list.innerHTML = estimates.map(e=>'<div class="saved-item"><div><div class="saved-name">'+e.name+'</div><div class="saved-date">'+e.date+' • '+e.grade+' • '+e.area+' sqft</div></div><div class="saved-amount">'+formatCurrency(e.cost)+'</div></div>').join("");
}

function newEstimate() {
  document.getElementById("ownerName").value="";
  document.getElementById("builtupArea").value="";
  document.getElementById("extraNotes").value="";
  floors=1;
  document.getElementById("floorsCount").textContent="1";
  selectedFeatures=[];
  document.querySelectorAll("#featuresGrid input").forEach(cb=>cb.checked=false);
  document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
  document.querySelector(".chip").classList.add("active");
  document.querySelectorAll(".grade-card").forEach(c=>c.classList.remove("active"));
  document.querySelector(".grade-card").classList.add("active");
  goToStep(1);
}

// References and options
const chartRefs = document.querySelectorAll(".chart > div");
const legendRef = document.querySelector(".legend");
const ctrRefs = document.querySelectorAll(".counter > p");
const header = document.querySelector("header");
const menu = document.querySelector("header > .menu");
const sidebar = document.querySelector("#sidebar");
const dateRanges = [...document.querySelectorAll("select")];
const seriesFilters = [...document.querySelectorAll(".chart-controls")].map(control => control.querySelectorAll("button"));
const seriesOptions = {
    labelsDiv: legendRef,
    labelsSeparateLines: true,
    labels: ["Time", "Value", "Anomaly"],
    colors: [
        "rgb(87, 148, 242)",
        "rgb(196, 22, 42)",
    ],
    pointSize: 3,
    highlightCircleSize: 5,
};
const modelOptions = {
    labelsDiv: legendRef,
    labelsSeparateLines: true,
    labels: ["Time", "Value", "Upper", "Lower", "Predicted", "Anomaly"],
    colors: [
        "rgb(87, 148, 242)",
        "rgba(255, 115, 131, 0.5)",
        "rgba(255, 115, 131, 0.5)",
        "rgb(255, 166, 176)",
        "rgb(196, 22, 42)",
    ],
    pointSize: 3,
    highlightCircleSize: 5,
};
const chartOptions = [seriesOptions, modelOptions];

// Gloabal/state variables
let graphs = [], sidebarOpen = false;

const apiCall = new XMLHttpRequest();
apiCall.open("GET", "./chart1.json");
apiCall.onload = () => {
    apiCall2.send();
    initGraph(apiCall.responseText, timeSeriesPipe, seriesOptions);
}
apiCall.send();

const apiCall2 = new XMLHttpRequest();
apiCall2.open("GET", "./chart2.json");
apiCall2.onload = () => initGraph(apiCall2.responseText, modelPipe, modelOptions);

// Graphs
function initGraph(raw, pipe, options) {
    const chartIndex = graphs.length;
    let temp = (pipe(JSON.parse(raw)));

    const rightBoundary = temp[temp.length - 1][0].getTime();
    const leftBoundary = rightBoundary - 1000 * 3600 * 24;

    options.dateWindow = [leftBoundary, rightBoundary];
    options.title = `Chart ${chartIndex + 1}`;

    graphs.push(new Dygraph(
        chartRefs[chartIndex],
        temp,
        options
    ));
    graphs[chartIndex].updateOptions({
        drawCallback: (g) => countAnomalies(g.xAxisRange(), chartIndex),
        pointClickCallback: (e, point) => console.log(point)
    })
}

function timeSeriesPipe(raw) {
    return raw.map((point) => {
        const time = (new Date(point["observation_time"]));
        const value = point["actual_value"];
        if (point["anomaly_label"])
            return [time, value, value];
        return [time, value, null];
    })
}

function modelPipe(raw) {
    const out = raw.map((point) => {
        const time = (new Date(point["obs_time"]));
        const actual = point["actual_value"];
        const upper = point["upper_bound"];
        const lower = point["lower_bound"];
        const predicted = point["predicted_value"];
        const anomaly = point["anomaly"];
        return [time, actual, upper, lower, predicted, anomaly];
    })
    return out;
}

// Legend
const legendFollow = (e) => {
    legendRef.style.left = e.pageX + 15 + 'px';
    legendRef.style.top = e.pageY + 15 + 'px';
}
for (let chartRef of chartRefs) chartRef.addEventListener("mousemove", legendFollow);

// Counters
function countAnomalies(range = [-1, -1], index = 0) {
    const leftBoundary = range[0];
    const rightBoundary = range[1];
    const data = graphs[index].rawData_;
    let anomaly_ctr = 0, total_ctr = 0, i = 0, len = data[0].length;
    for (i = 0; i < data.length && data[i][0] < rightBoundary; ++i) {
        if (data[i][0] >= leftBoundary) {
            if (data[i][len - 1]) anomaly_ctr++;
            total_ctr++;
        }
    }
    ctrRefs[index * 2].innerHTML = anomaly_ctr;
    if (total_ctr)
        ctrRefs[index * 2 + 1].innerHTML = Math.round(anomaly_ctr / total_ctr * 10000) / 100 + '%';
    else ctrRefs[index * 2 + 1].innerHTML = "0%";
}

// Header 
const headerOffset = header.offsetTop;
let latestOffset = 0;
window.onscroll = () => {
    if (window.scrollY < latestOffset && window.scrollY > headerOffset)
        header.classList.add("sticky");
    else header.classList.remove("sticky");
    latestOffset = window.scrollY;
    closeSidebar();
}

menu.addEventListener("click", () => {
    if (sidebarOpen) closeSidebar();
    else openSidebar();
})

// Sidebar
function closeSidebar() {
    sidebarOpen = false;
    menu.children[0].classList.remove("invisible_icon");
    menu.children[1].classList.add("invisible_icon");
    sidebar.classList.remove("open");
}

function openSidebar() {
    sidebarOpen = true;
    menu.children[0].classList.add("invisible_icon");
    menu.children[1].classList.remove("invisible_icon");
    sidebar.classList.add("open");
}

// Graph controls
dateRanges.forEach((dateRange, index) => {
    dateRange.addEventListener("change", (e) => {
        let timeInterval;
        switch (parseInt(e.target.value)) {
            case 1: timeInterval = 1000 * 3600 * 24 * 365; break;
            case 2: timeInterval = 1000 * 3600 * 24 * 365 * 2; break;
            case 4: timeInterval = 1000 * 3600 * 24 * 365 * 4 + 1; break;
            case 6: timeInterval = 1000 * 3600 * 12 * 365; break;
            case 7: timeInterval = 1000 * 3600 * 24 * 7; break;
            case 12: timeInterval = 1000 * 3600 * 12; break;
            case 24: timeInterval = 1000 * 3600 * 24; break;
            case 30: timeInterval = 1000 * 3600 * 24 * 30; break;
        }
        const len = graphs[index].rawData_.length;
        const latestTime = graphs[index].rawData_[len - 1][0];
        graphs[index].updateOptions({
            dateWindow: [latestTime - timeInterval, latestTime]
        })
    })
});

for (let i = 0; i < seriesFilters.length; ++i) {
    for (let j = 0; j < seriesFilters[i].length; ++j) seriesFilters[i][j].addEventListener("click", () => {
        const filter = seriesFilters[i][j];
        if (filter.classList.contains("toggled"))
            graphs[i].updateOptions({ colors: graphs[i].colors_.map((color, index) => index != j ? color : "transparent") });
        else graphs[i].updateOptions({ colors: graphs[i].colors_.map((color, index) => index != j ? color : chartOptions[i]["colors"][j]) })
        filter.classList.toggle("toggled");
    });
}
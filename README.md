#AutoDC
Create one-time use [DC.js](https://dc-js.github.io/dc.js/) charts from csv files.




##Some pictures

Initial page load. Pick an example data set or upload your own. Then click the "Load Data" button.

IMAGE

Use the table to choose which type of dc.js chart to create for each column detected in the csv file. Row charts work for most data types, Bar charts require numerical data, and Time charts require Dates. Click the "Go" button to create the actual charts.



IMAGE
Interact with the charts to cross-filter the dataset. Row charts can be single-clicked on. Bar and Time charts can be click-dragged.

After filtering, notice that the filtered chart stays the same but everything else updated.

IMAGE
Filters can be reset by clicking the "reset" link that appears above a chart after it's been clicked on.

IMAGE -highlighting reset button

Below the charts is a counter showing on how many data points match the cross-filter criteria out of the total number of data points. Here you can download a copy of the filtered data.

IMAGE

Finally, the table at the bottom shows the filtered data in table-format. It also groups the data by what was selected from the creation table.

IMAGE

##Run it yourself


Install yourself 
1. Get [npm](https://nodejs.org/en/)
2. Install bower `npm install -g bower` (might need admin privileges)
3. Get a static file-server like [http-server](https://github.com/indexzero/http-server), [Apache](https://www.apache.org/), [nginx](https://www.nginx.com/resources/wiki/), [Caddy](https://caddyserver.com/), or use Python's built-in [SimpleHTTPServer](https://docs.python.org/2/library/simplehttpserver.html)
4. Get the code, install dependencies, and serve the directory (this is using http-server)
```
git clone https://github.com/Weatherproof/AutoDC
cd AutoDC
npm install
bower install
http-server .
```

##Example Data Sets
The example data sets were plucked from [PivotTable.js](http://nicolas.kruchten.com/pivottable/examples/) and [Raw.js](http://raw.densitydesign.org/)





##Future Features

- An "advanced" view for creating a chart that has more grouping options, allows the user to pick the x-axis and y-axis dimensions, etc.
- More chart types. DC.js has documentation for donut/pie, line, bubble, scatter, heatmap, choropleth, and boxplot.

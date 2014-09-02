$(document).ready(function () {

	function stripNewLinesAndTrim(text){
		return text.replace(/(\r\n|\n|\r)/gm,"").trim();
	}

	$("td").each(function(t, td){
		td = $(td);
		td.find("img").each(function(i, img){
			$(img).replaceWith( $(img).attr("alt"));
		});

		td.html(td.text());
		
	});

	var totalData = {};
	$("h2").each(function (i, el){
		var title = $(el).text().replace("[edit]", "");
		console.log(title);
		var table = $(el).next();
		
		var map = [];
		$(table).find("th").each(function (hederid, header) {
			var cleanText = stripNewLinesAndTrim($(header).text()).replace("[Collapse]", "").replace("[Expand]", "").trim();
			map.push(cleanText);
		});

		var tierData = {}
		$(table).find("tr").each(function (rowid, row) {
			var rowData = {}
			if(rowid == 0) return;
			$(row).find("td").each(function(cellid, cell){
				var cellText = stripNewLinesAndTrim($(cell).text());
//				console.log("   ", cellText);
				rowData[map[cellid]] = cellText;
			});
			tierData[rowData["Aspect Symbol"]] = rowData;
		});

		totalData[title] = tierData;

	});

	console.log(JSON.stringify(totalData));
//	console.log((totalData));
});



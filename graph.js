var width = 960,
	height = 500;

var color = d3.scale.category20();
var svg = d3.select("#svg1").append("svg")
		.attr("width", width)
		.attr("height", height);

function attachLink(a, b, pathEl, isFrom){
	if(!a.links) {
		a.links = [];
	}
	a.links.push({ 
		id : b,
		path: pathEl,
		isFrom: isFrom
	});
}


function drawChart(data) {
	var lineFunc = d3.svg.line()
			.x(function(d) {
				return (d.x);
			})
			.y(function(d) {
				return (d.y);
			})
			.interpolate('linear');


	var places = svg.selectAll('circle').data(data.nodes);
	var nodeGroups = places
			.enter()
			.append("g")
			.attr("transform", function(d) { 
				d.element = this;
				var tier = d.tier;
				var numNodes = tier.nodes.length;
				var yoff = numNodes/2 * 20;
				var ypos = height/2 + -yoff + d.counter * 20;
				d.ypos = ypos;
				return 'translate(' + [20 + d.tierId * 100, ypos ] + ')'; 
			})
			.on("mouseover" , function (node) {
				_.each(node.links, function (link){
					var path = $(link.path);
					path.attr("class", (path.attr("class") || "") + " highlight");
					path.attr("class", path.attr("class") + " is-from-" + link.isFrom);
				});
			})
			.on("mouseout" , function (node) {
				_.each(node.links, function (link){
					var path = $(link.path);
					path.attr("class", path.attr("class").replace("highlight", ""));
					path.attr("class", path.attr("class").replace(/is-[^ ]*/, ""));
					path.attr("class", path.attr("class").replace(/[ ]*/, " "));
				});
			});

	var lines = svg.selectAll('line').data(data.links)
			.enter()
			.append("path")
			.attr("d", function (d) {
				var source = nodes[d.source];
				var target = nodes[d.target];

				attachLink(source, target, this, true);
				attachLink(target, source, this, false);

				var values = [
					{x: 10 + source.tierId * 100, y: source.ypos},
					{x: 10 + target.tierId * 100, y: target.ypos}
				];

				return lineFunc(values);
			});

	nodeGroups
		.append("circle")
		.attr("class", "node")
		.attr("r", 5)
		.attr("cx", function (d) {
			return -7;
		})
		.attr("cy", function (d) {
			return -4;
		})
		.style("fill", function(d) {
			return color(d.tierId);
		})
		.on("click",  function (node) {
			// console.log("clickme ", node);
		});

	nodeGroups
		.append("text")
		.text(function(d) { 
			return d.name; 
		});
}



// build all the map objects 
var data = getData();
var nodes = [];
var tiers = [];
var nodeMap = {};

_.each(data, function (tierData, tierName) {
	//console.log(tierName);
	tierId = tierName.replace("Tier", "");
	tierId = parseInt(tierId);
	var currTier = {
		tierId: tierId,
		tierName: tierName,
		nodes: []
	};
	tiers.push(currTier);
	var counter = 0;

	_.each(tierData, function (aspect){
		counter ++;
		aspect.counter = counter;

		aspect.tierId = tierId;
		aspect.tier = currTier;
		var aspectName = aspect["Aspect Symbol"];
		aspect.name = aspectName;
		nodes.push(aspect);
		currTier.nodes.push(aspect);
		nodeMap[aspect.name] = nodes.length -1;

	});	

});
// console.log(nodeMap.Aqua, nodes[1].name);

var links = [];
_.each(nodes, function(node, i) {
	var linkParts;
	if(node["Components"]){
		linkParts = node["Components"].split(" + ");
		//console.log(linkParts);
		_.each(linkParts, function(linkPart){
			links.push({
				source: i, target: nodeMap[linkPart], value: 1
			});
		});
	}
});

var data = {
	tiers: tiers,
	nodes: nodes,
	links: links
};

//drawGraph(data);

drawChart(data);
createSelectors(data);

function findPath(currNode, searchNode, depth, currPath , goodPaths, maxDistance){
	if(depth === maxDistance) {
		return false;
	}
	var newCurrPath = currPath.slice(0);
	newCurrPath.push(currNode.name);

	_.each(currNode.links, function(link){	
		if(link.id.name === searchNode.name) {
			var goodCurrentPath = newCurrPath.slice(0);
			goodCurrentPath.push(link.id.name);
			goodPaths.push(goodCurrentPath);
		} else {
			findPath(link.id, searchNode, depth + 1, newCurrPath, goodPaths, maxDistance);
		}
	});
	return true;
}


function createSelectors (nodeData) {
	var from = $("<select>"),
		to =  $("<select>"),
		distance =  $("<select>"),
		controlContainer = $("<div>"),
		sortBy = $("<select><option>length alpha</option><option>points</option></select>");

	$(controlContainer).append(from);
	$(controlContainer).append(to);
	$(controlContainer).append(distance);
	$(controlContainer).append(sortBy);

	var alphaNodes = nodes.slice(0);

	alphaNodes = alphaNodes.sort(function (a,b){
		if(a.name < b.name) {
			return -1
		} else {
			return 1
		}
	});

	_.each(alphaNodes, function (n){
		var elHTML = "<option value='" + n.name + "'>" + n.name + "</option>";
		from.append(elHTML);
		to.append(elHTML);
	});

	for(var x=2; x< 10; x++){
		distance.append("<option>" + x + "</option>");
	} 


	$("#controls").append(controlContainer);
	
	function doFindPath (){
		var fromNodeName = from.val(),
			toNodeName = to.val(),
			fromNode = nodes[nodeMap[fromNodeName]],
			toNode = nodes[nodeMap[toNodeName]], 
			distanceVal = parseInt(distance.val()); 

		console.log("Searching for path ");
		console.log("   ", toNodeName, fromNodeName);
		var goodPaths = [];
		findPath(fromNode , toNode, 0 , [], goodPaths, distanceVal);
		$("#result").html("");
		// sort by length then name 
		console.log(sortBy.val());

		if(sortBy.val() === "points"){ 
			_.each(goodPaths, function(goodPath){
				var tierTotal = 0;
				_.each(goodPath, function (aspect){
					//console.log(aspect, nodes[nodeMap[aspect]].tier +1);
					tierTotal += (nodes[nodeMap[aspect]].tierId +1);
				});
				goodPath.push(tierTotal);
			});

			goodPaths.sort(function(a, b){
				if(a[a.length-1] > b[b.length-1]) {
					return 1;
				} else if (a[a.length-1] < b[b.length-1]) {
					return -1;
				} else {
					if(a.join(" ") > b.join(" ") ){
						return 1;
					} else {
						return -1
					}
				}
			});
		}else {
			goodPaths.sort(function(a, b){
				if(a.length > b.length) {
					return 1;
				} else if (a.length < b.length) {
					return -1;
				} else {
					if(a.join(" ") > b.join(" ") ){
						return 1;
					} else {
						return -1
					}
				}
			});
		}
 
		$("#result span").off();
		_.each(goodPaths, function(goodPath){			
			var p = $("<p><span>" + goodPath.join("</span> > <span>") + "</span></p>");
			$(p).find("span").on("mouseover", function (e){
				var aspect = $(e.target).text();
				console.log(aspect);
			});
			$("#result").append(p);
		});
	}

	sortBy.on('change', function(){
		doFindPath();
	});

	to.on('change', function(){
		doFindPath();
	});

	from.on('change', function(){
		doFindPath();
	});

	distance.on('change', function(){
		doFindPath();
	});

}


var drawGraph = function(graph) {
	var force = d3.layout.force()
			.charge(-120)
			.linkDistance(30)
			.size([width, height]);

	force
		.nodes(graph.nodes)
		.links(graph.links)
		.start();

	var link = svg.selectAll(".link")
			.data(graph.links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) { return Math.sqrt(d.value); });

	var gnodes = svg.selectAll('g.gnode')
			.data(graph.nodes)
			.enter()
			.append('g')
			.classed('gnode', true);
    
	var node = gnodes.append("circle")
			.attr("class", "node")
			.attr("r", 5)
			.style("fill", function(d) { return color(d.tier); })
			.call(force.drag);

	//	var labels = gnodes.append("text")
	//		.text(function(d) { return d.name; });

	//	console.log(labels);
    
	force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		gnodes.attr("transform", function(d) { 
			return 'translate(' + [d.x, d.y] + ')'; 
		});
		
		
	});
};



function getData() {

	return {
		"Tier 0 (Primal aspects)": {
			"Aer": {
				"Aspect Symbol": "Aer",
				"Aspect Name": "Aer(AH-er)Air",
				"Found in": "Sugar, Sugarcane, Tall Grass, Air Shard, Feather, Chicken, Fern, music disc, Bat, Block of Aluminum"
			},
			"Aqua": {
				"Aspect Symbol": "Aqua",
				"Aspect Name": "Aqua(AH-qwah)Water",
				"Found in": "Sugar, Sugarcane, Cactus, Lilypad, Fish, Clay, Water Bucket, Water Shard, Iron Tank Wall\/Gauge\/Valve"
			},
			"Ignis": {
				"Aspect Symbol": "Ignis",
				"Aspect Name": "Ignis(IG-nis)Fire",
				"Found in": "Coal, Coal Coke, Blaze Rod, Cinderpearl, Obsidian, Netherrack, Brick, Coal Dust, Fire Shard, Lava Bucket, Gunpowder, Furnace"
			},
			"Ordo": {
				"Aspect Symbol": "Ordo",
				"Aspect Name": "Ordo(OR-do)Order",
				"Found in": "Lead Ingot, Lead Block, Steel Ingot, Steel Block, Crucible, Order Shard, Smooth Sandstone, Quarried Block, Silverwood Logs, Division Sigil, Hoe of Growth, Chiseled Stone Bricks"
			},
			"Perditio": {
				"Aspect Symbol": "Perditio",
				"Aspect Name": "Perditio(Pehr-DI-ti-o)Entropy",
				"Found in": "Cobblestone, Sandstone, Sand, Cactus, Dead Bush, Most kinds of Dusts, Entropy Shard"
			},
			"Terra": {
				"Aspect Symbol": "Terra",
				"Aspect Name": "Terra(TEH-ra)Earth",
				"Found in": "Dirt, Grass, Sand, Earth Shard, Gravel, Clay, Apatite ore,  Roots, Cows, Hardened Sand, Donkey, Horse, Mud"
			}
		},
		"Tier 1": {
			"Gelum": {
				"Aspect Symbol": "Gelum",
				"Aspect Name": "Gelum(GEH-lum)Ice",
				"Components": "Ignis + Perditio",
				"Found in": "Snow, Ice, Snowball"
			},
			"Lux": {
				"Aspect Symbol": "Lux",
				"Aspect Name": "Lux(Lucks)Light",
				"Components": "Aer + Ignis",
				"Found in": "Glowstone, Glowstonedust, Torch, Quarried Stone"
			},
			"Motus": {
				"Aspect Symbol": "Motus",
				"Aspect Name": "Motus(MO-tus)Movement",
				"Components": "Aer + Aqua",
				"Found in": "Door, Rubber Bar, Rubber, Trapdoor, Piston, Sticky Piston"
			},
			"Potentia": {
				"Aspect Symbol": "Potentia",
				"Aspect Name": "Potentia(Po-TEN-ti-a)Power",
				"Components": "Ordo + Ignis",
				"Found in": "Coal Dust, Coal, Coal Coke, Redstone, Nether Quartz"
			},
			"Saxum": {
				"Aspect Symbol": "Saxum",
				"Aspect Name": "Saxum(SAHX-um)Stone",
				"Components": "Terra + Terra",
				"Found in": "Stone, Cobblestone, Sandstone, Smooth Sandstone, Chsiseled Sandstone, Sandstone Slab, TConstruct Sandstone Bricks"
			},
			"Vacuos": {
				"Aspect Symbol": "Vacuos",
				"Aspect Name": "Vacuos(VAH-cu-os)Void",
				"Components": "Aer + Perditio",
				"Found in": "Chest, Void, Iron Tank Wall\/Valve\/Gauge, Bowl, Stone Barrel, Deep Storage Unit"
			},
			"Victus": {
				"Aspect Symbol": "Victus",
				"Aspect Name": "Victus(VIK-tus)Life",
				"Components": "Aqua + Terra",
				"Found in": "Rose, Flower, Egg, Fish, Pork, Raw Beef, Raw Porkchop, Fibrous Taint, Barley"
			}
		},
		"Tier 2": {
			"Bestia": {
				"Aspect Symbol": "Bestia",
				"Aspect Name": "Bestia(BAYS-ti-ah)Animal, Beast",
				"Components": "Motus + Victus",
				"Found in": "Leather, Raw Beef, String, Egg, Raw Pork, Raw Chicken, Chicken (mob), Cow (mob), Pig (mob)"
			},
			"Fames": {
				"Aspect Symbol": "Fames",
				"Aspect Name": "Fames(FAH-mays)Hunger",
				"Components": "Victus + Vacuos",
				"Found in": "Apple, Wheat, Bread, Bucket of Milk, Potato, Cooked Potato, Carrot, Cooked Chicken, Steak"
			},
			"Granum": {
				"Aspect Symbol": "Granum",
				"Aspect Name": "Granum(GRAH-num)Seed",
				"Components": "Victus + Ordo",
				"Found in": "Seeds, Saplings, Egg"
			},
			"Iter": {
				"Aspect Symbol": "Iter",
				"Aspect Name": "Iter(EE-tehr)Journey",
				"Components": "Motus + Terra",
				"Found in": "Boat, Ender Pearl (4), Fence Gate, Minecart, Saddle, Netherportal"
			},
			"Limus": {
				"Aspect Symbol": "Limus",
				"Aspect Name": "Limus(LEE-mus)Slime",
				"Components": "Victus + Aqua",
				"Found in": "Slimeball, Raw Rubber, Tainted Goo"
			},
			"Metalum": {
				"Aspect Symbol": "Metalum",
				"Aspect Name": "Metallum(Meh-TAL-lum)Metal",
				"Components": "Saxum + Ordo",
				"Found in": "Almost every Ingot and metal Ore, Iron Tank Wall\/Gauge\/Valve,"
			},
			"Mortuus": {
				"Aspect Symbol": "Mortuus",
				"Aspect Name": "Mortuus(Mor-TOO-us)Death",
				"Components": "Victus + Perditio",
				"Found in": "Bone, Zombie Brain, Rotten Flesh, Potion of Harming"
			},
			"Permutatio": {
				"Aspect Symbol": "Permutatio",
				"Aspect Name": "Permutatio(Pehr-moo-TAH-ti-o)Exchange",
				"Components": "Perditio + Ordo",
				"Found in": "Transformation Powder, Copper Ingot, Shimmerleaf, Hopper, Quicksilver"
			},
			"Praecantatio": {
				"Aspect Symbol": "Praecantatio",
				"Aspect Name": "Praecantatio(Prai-cahn-TAH-ti-o)Magic",
				"Components": "Vacuos + Potentia",
				"Found in": "Cinderpearl, Crucible, Transformation Powder, Shards, Greatwood and Silverwood Logs, Mossy Cobblestone, Nether Wart, Blaze Rod, Chiseled Sandstone"
			},
			"Sano": {
				"Aspect Symbol": "Sano",
				"Aspect Name": "Sano(SAH-no)Healing",
				"Components": "Victus + Victus",
				"Found in": "Potion(s) of Healing, Bucket of Milk, Milk, Cake, Golden Apple"
			},
			"Tempestas": {
				"Aspect Symbol": "Tempestas",
				"Aspect Name": "Tempestas(Tem-PES-tas)Storm",
				"Components": "Aer + Motus",
				"Found in": "Cloud"
			},
			"Tenebrae": {
				"Aspect Symbol": "Tenebrae",
				"Aspect Name": "Tenebrae(Teh-NEH-brae)Darkness",
				"Components": "Vacuos + Lux",
				"Found in": "Mushrooms, Obsidian, Obsidian Tile, Obsidian Totem"
			},
			"Vinculum": {
				"Aspect Symbol": "Vinculum",
				"Aspect Name": "Vinculum(VIN-coo-lum)Trap",
				"Components": "Motus + Perditio",
				"Found in": "Soul Sand, Amber, Amber Bearing Stone, Cobweb"
			},
			"Vitreus": {
				"Aspect Symbol": "Vitreus",
				"Aspect Name": "Vitreus(VI-treh-us)Crystal",
				"Components": "Terra + Ordo",
				"Found in": "Diamond, Tin Ore, Tin Ingot, Tin Dust, Nether Quartz, Amber, Shards, Glass"
			},
			"Volatus": {
				"Aspect Symbol": "Volatus",
				"Aspect Name": "Volatus(Vo-LAH-tus)Flight",
				"Components": "Aer + Motus",
				"Found in": "Feather, Cloud, Bow, Arrow"
			},
			"Tempus": {
				"Aspect Symbol": "Tempus",
				"Aspect Name": "(MB) Tempus(TEM-pus)Time",
				"Components": "Vacuos + Ordo",
				"Found in": "Repeater, Clock"
			}
		},
		"Tier 3": {
			"Alienis": {
				"Aspect Symbol": "Alienis",
				"Aspect Name": "Alienis(Ah-li-AY-nis)Strange, Alien",
				"Components": "Vacuos + Tenebrae",
				"Found in": "Ender Pearl, Obsidian Totem, Runic Matrix"
			},
			"Auram": {
				"Aspect Symbol": "Auram",
				"Aspect Name": "Auram(OW-rahm)Aura",
				"Components": "Praecantatio + Aer",
				"Found in": "Ethereal Essence (Wisps, Broken Nodes)"
			},
			"Corpus": {
				"Aspect Symbol": "Corpus",
				"Aspect Name": "Corpus(COR-pus)Body",
				"Components": "Mortuus + Bestia",
				"Found in": "Rotten Flesh, Beef, Porkchops, Fish, Chicken, Bone, Zombie Brain"
			},
			"Exanimis": {
				"Aspect Symbol": "Exanimis",
				"Aspect Name": "Exanimis(Ex-AH-ni-mis)Resurrection",
				"Components": "Motus + Mortuus",
				"Found in": "Ethereal Essences, Ghast Tears, Monster Spawners, Zombie Brains, Skeleton Head"
			},
			"Herba": {
				"Aspect Symbol": "Herba",
				"Aspect Name": "Herba(HEHR-bah)Plant",
				"Components": "Victus + Terra",
				"Found in": "Seeds, Saplings, Sugarcane, Leaf Blocks, Nether Wart, Grass Block"
			},
			"Spiritus": {
				"Aspect Symbol": "Spiritus",
				"Aspect Name": "Spiritus(SPEE-ri-tus)Spirit, Soul",
				"Components": "Victus + Mortuus",
				"Found in": "Soul Sand, Ghast Tear, Zombie Head"
			},
			"Venenum": {
				"Aspect Symbol": "Venenum",
				"Aspect Name": "Venenum(Veh-NAY-num)Poison",
				"Components": "Aqua + Mortuus",
				"Found in": "Spider eye, Quicksilver, Poisoned potato, Potion of Poison"
			},
			"Vitium": {
				"Aspect Symbol": "Vitium",
				"Aspect Name": "Vitium(VIH-tee-um)Taint",
				"Components": "Praecantatio + Perditio",
				"Found in": "Taintacle, Fibrous taint, Tainted Goo"
			}
		},
		"Tier 4": {
			"Arbor": {
				"Aspect Symbol": "Arbor",
				"Aspect Name": "Arbor(AR-bor)Wood",
				"Components": "Aer + Herba",
				"Found in": "Stick, Wood Planks, Wood Slabs, Tools, Wood Logs"
			},
			"Cognitio": {
				"Aspect Symbol": "Cognitio",
				"Aspect Name": "Cognitio(Cog-NIH-ti-o)Thought, Mind",
				"Components": "Terra + Spiritus",
				"Found in": "Paper, Books, Zombie Brain, Knowledge Fragment, Experience Orb, Thaumonocon"
			},
			"Sensus": {
				"Aspect Symbol": "Sensus",
				"Aspect Name": "Sensus(SEN-sus)Sense",
				"Components": "Aer + Spiritus",
				"Found in": "Ink Sac, Lapis Lazuli, Lapis Lazuli Ore, Lapis Lazuli Block, Rose, Flowers, Bone Meal, Carrots, Spider Eye, Cocoa Beans"
			}
		},
		"Tier 5": {
			"Humanus": {
				"Aspect Symbol": "Humanus",
				"Aspect Name": "Humanus(Hoo-MAH-nus)Human",
				"Components": "Bestia + Cognitio",
				"Found in": "Rotten Flesh, Villager (mob), Skeleton (mob), Zombie (mob)"
			}
		},
		"Tier 6": {
			"Instrumentum": {
				"Aspect Symbol": "Instrumentum",
				"Aspect Name": "Instrumentum(In-struh-MEN-tum)Tool",
				"Components": "Humanus + Ordo",
				"Found in": "Flint, Shovels and Axes (pre 4.1). Steel, Shovels and Axes (post 4.1.)"
			},
			"Lucrum": {
				"Aspect Symbol": "Lucrum",
				"Aspect Name": "Lucrum(LOO-crum)Greed",
				"Components": "Humanus + Fames",
				"Found in": "Emerald, Diamond, Gold Ingot, Gold Block, Silver, Taintacle"
			},
			"Messis": {
				"Aspect Symbol": "Messis",
				"Aspect Name": "Messis(MESS-iss)Crop",
				"Components": "Herba + Humanus",
				"Found in": "Wheat, Bread, Potatoes, Carrot, Apple, Barley"
			},
			"Perfodio": {
				"Aspect Symbol": "Perfodio",
				"Aspect Name": "Perfodio(Pehr-FOH-di-o)Dig, Mine",
				"Components": "Humanus + Terra",
				"Found in": "Pickaxes"
			}
		},
		"Tier 7": {
			"Fabrico": {
				"Aspect Symbol": "Fabrico",
				"Aspect Name": "Fabrico(FAH-bri-co)Create, Build",
				"Components": "Humanus + Instrumentum",
				"Found in": "Crafting Table, Anvil, Wool, Cooked Chicken, Steak, Bed"
			},
			"Machina": {
				"Aspect Symbol": "Machina",
				"Aspect Name": "Machina(MAH-ki-na)Machine",
				"Components": "Motus + Instrumentum",
				"Found in": "Button, Lever, Door, Redstone, Pressure Pads, Hopper, Redstone Comparator, Redstone repeater"
			},
			"Meto": {
				"Aspect Symbol": "Meto",
				"Aspect Name": "Meto(MEH-to)Harvest, Reap",
				"Components": "Messis + Instrumentum",
				"Found in": "Shears, Hoes"
			},
			"Pannus": {
				"Aspect Symbol": "Pannus",
				"Aspect Name": "Pannus(PAN-nus)Fabric",
				"Components": "Instrumentum + Bestia",
				"Found in": "Leather, Wool, String, Bed"
			},
			"Telum": {
				"Aspect Symbol": "Telum",
				"Aspect Name": "Telum(TAY-lum)Weapon",
				"Components": "Instrumentum + Perditio",
				"Found in": "Bow, Arrow, Sword"
			},
			"Tutamen": {
				"Aspect Symbol": "Tutamen",
				"Aspect Name": "Tutamen(Tu-TAH-men)Armor",
				"Components": "Instrumentum + Terra",
				"Found in": "Helmets, Chest, Leggings, Boots, Leather, Potion of Fire Resistance"
			}
		}
	};


	//	return {"Tier 0 (Primal aspects)":{"Aer":{"Aspect Symbol":"Aer","Aspect Name":"Aer(AH-er)Air","Found in":"Sugar, Sugarcane, Tall Grass, Air Shard, Feather, Chicken, Fern, music disc, Bat, Block of Aluminum"},"Aqua":{"Aspect Symbol":"Aqua","Aspect Name":"Aqua(AH-qwah)Water","Found in":"Sugar, Sugarcane, Cactus, Lilypad, Fish, Clay, Water Bucket, Water Shard, Iron Tank Wall/Gauge/Valve"},"Ignis":{"Aspect Symbol":"Ignis","Aspect Name":"Ignis(IG-nis)Fire","Found in":"Coal, Coal Coke, Blaze Rod, Cinderpearl, Obsidian, Netherrack, Brick, Coal Dust, Fire Shard, Lava Bucket, Gunpowder, Furnace"},"Ordo":{"Aspect Symbol":"Ordo","Aspect Name":"Ordo(OR-do)Order","Found in":"Lead Ingot, Lead Block, Steel Ingot, Steel Block, Crucible, Order Shard, Smooth Sandstone, Quarried Block, Silverwood Logs, Division Sigil, Hoe of Growth, Chiseled Stone Bricks"},"Perditio":{"Aspect Symbol":"Perditio","Aspect Name":"Perditio(Pehr-DI-ti-o)Entropy","Found in":"Cobblestone, Sandstone, Sand, Cactus, Dead Bush, Most kinds of Dusts, Entropy Shard"},"Terra":{"Aspect Symbol":"Terra","Aspect Name":"Terra(TEH-ra)Earth","Found in":"Dirt, Grass, Sand, Earth Shard, Gravel, Clay, Apatite ore,  Roots, Cows, Hardened Sand, Donkey, Horse, Mud"}},"Tier 1":{"Gelum":{"Aspect Symbol":"Gelum","Aspect Name":"Gelum(GEH-lum)Ice","Components":"Ignis + Perditio","Found in":"Snow, Ice, Snowball"},"Lux":{"Aspect Symbol":"Lux","Aspect Name":"Lux(Lucks)Light","Components":"Aer + Ignis","Found in":"Glowstone, Glowstonedust, Torch, Quarried Stone"},"Motus":{"Aspect Symbol":"Motus","Aspect Name":"Motus(MO-tus)Movement","Components":"Aer + Aqua","Found in":"Door, Rubber Bar, Rubber, Trapdoor, Piston, Sticky Piston"},"Potentia":{"Aspect Symbol":"Potentia","Aspect Name":"Potentia(Po-TEN-ti-a)Power","Components":"Ordo + Ignis","Found in":"Coal Dust, Coal, Coal Coke, Redstone, Nether Quartz"},"Saxum":{"Aspect Symbol":"Saxum","Aspect Name":"Saxum(SAHX-um)Stone","Components":"Terra + Terra","Found in":"Stone, Cobblestone, Sandstone, Smooth Sandstone, Chsiseled Sandstone, Sandstone Slab, TConstruct Sandstone Bricks"},"Vacuos":{"Aspect Symbol":"Vacuos","Aspect Name":"Vacuos(VAH-cu-os)Void","Components":"Aer + Perditio","Found in":"Chest, Void, Iron Tank Wall/Valve/Gauge, Bowl, Stone Barrel, Deep Storage Unit"},"Victus":{"Aspect Symbol":"Victus","Aspect Name":"Victus(VIK-tus)Life","Components":"Aqua + Terra","Found in":"Rose, Flower, Egg, Fish, Pork, Raw Beef, Raw Porkchop, Fibrous Taint, Barley"}},"Tier 2":{"Bestia":{"Aspect Symbol":"Bestia","Aspect Name":"Bestia(BAYS-ti-ah)Animal, Beast","Components":"Motus + Victus","Found in":"Leather, Raw Beef, String, Egg, Raw Pork, Raw Chicken, Chicken (mob), Cow (mob), Pig (mob)"},"Fames":{"Aspect Symbol":"Fames","Aspect Name":"Fames(FAH-mays)Hunger","Components":"Victus + Vacuos","Found in":"Apple, Wheat, Bread, Bucket of Milk, Potato, Cooked Potato, Carrot, Cooked Chicken, Steak"},"Granum":{"Aspect Symbol":"Granum","Aspect Name":"Granum(GRAH-num)Seed","Components":"Victus + Ordo","Found in":"Seeds, Saplings, Egg"},"Iter":{"Aspect Symbol":"Iter","Aspect Name":"Iter(EE-tehr)Journey","Components":"Motus + Terra","Found in":"Boat, Ender Pearl (4), Fence Gate, Minecart, Saddle, Netherportal"},"Limus":{"Aspect Symbol":"Limus","Aspect Name":"Limus(LEE-mus)Slime","Components":"Victus + Aqua","Found in":"Slimeball, Raw Rubber, Tainted Goo"},"Metalum":{"Aspect Symbol":"Metalum","Aspect Name":"Metallum(Meh-TAL-lum)Metal","Components":"Saxum + Ordo","Found in":"Almost every Ingot and metal Ore, Iron Tank Wall/Gauge/Valve,"},"Mortuus":{"Aspect Symbol":"Mortuus","Aspect Name":"Mortuus(Mor-TOO-us)Death","Components":"Victus + Perditio","Found in":"Bone, Zombie Brain, Rotten Flesh, Potion of Harming"},"Permutatio":{"Aspect Symbol":"Permutatio","Aspect Name":"Permutatio(Pehr-moo-TAH-ti-o)Exchange","Components":"Perditio + Ordo","Found in":"Transformation Powder, Copper Ingot, Shimmerleaf, Hopper, Quicksilver"},"Praecantatio":{"Aspect Symbol":"Praecantatio","Aspect Name":"Praecantatio(Prai-cahn-TAH-ti-o)Magic","Components":"Vacuos + Potentia","Found in":"Cinderpearl, Crucible, Transformation Powder, Shards, Greatwood and Silverwood Logs, Mossy Cobblestone, Nether Wart, Blaze Rod, Chiseled Sandstone"},"Sano":{"Aspect Symbol":"Sano","Aspect Name":"Sano(SAH-no)Healing","Components":"Victus + Victus","Found in":"Potion(s) of Healing, Bucket of Milk, Milk, Cake, Golden Apple"},"Tempestas":{"Aspect Symbol":"Tempestas","Aspect Name":"Tempestas(Tem-PES-tas)Storm","Components":"Aer + Motus","Found in":"Cloud"},"Tenebrae":{"Aspect Symbol":"Tenebrae","Aspect Name":"Tenebrae(Teh-NEH-brae)Darkness","Components":"Vacuos + Lux","Found in":"Mushrooms, Obsidian, Obsidian Tile, Obsidian Totem"},"Vinculum":{"Aspect Symbol":"Vinculum","Aspect Name":"Vinculum(VIN-coo-lum)Trap","Components":"Motus + Perditio","Found in":"Soul Sand, Amber, Amber Bearing Stone, Cobweb"},"Vitreus":{"Aspect Symbol":"Vitreus","Aspect Name":"Vitreus(VI-treh-us)Crystal","Components":"Terra + Ordo","Found in":"Diamond, Tin Ore, Tin Ingot, Tin Dust, Nether Quartz, Amber, Shards, Glass"},"Volatus":{"Aspect Symbol":"Volatus","Aspect Name":"Volatus(Vo-LAH-tus)Flight","Components":"Aer + Motus","Found in":"Feather, Cloud, Bow, Arrow"},"Tempus":{"Aspect Symbol":"Tempus","Aspect Name":"(MB) Tempus(TEM-pus)Time","Components":"Vacuos + Ordo","Found in":"Repeater, Clock"}},"Tier 3":{"Alienis":{"Aspect Symbol":"Alienis","Aspect Name":"Alienis(Ah-li-AY-nis)Strange, Alien","Components":"Vacuos + Tenebrae","Found in":"Ender Pearl, Obsidian Totem, Runic Matrix"},"Auram":{"Aspect Symbol":"Auram","Aspect Name":"Auram(OW-rahm)Aura","Components":"Praecantatio + Aer","Found in":"Ethereal Essence (Wisps, Broken Nodes)"},"Corpus":{"Aspect Symbol":"Corpus","Aspect Name":"Corpus(COR-pus)Body","Components":"Mortuus + Bestia","Found in":"Rotten Flesh, Beef, Porkchops, Fish, Chicken, Bone, Zombie Brain"},"Exanimis":{"Aspect Symbol":"Exanimis","Aspect Name":"Exanimis(Ex-AH-ni-mis)Resurrection","Components":"Motus + Mortuus","Found in":"Ethereal Essences, Ghast Tears, Monster Spawners, Zombie Brains, Skeleton Head"},"Herba":{"Aspect Symbol":"Herba","Aspect Name":"Herba(HEHR-bah)Plant","Components":"Victus + Terra","Found in":"Seeds, Saplings, Sugarcane, Leaf Blocks, Nether Wart, Grass Block"},"Spiritus":{"Aspect Symbol":"Spiritus","Aspect Name":"Spiritus(SPEE-ri-tus)Spirit, Soul","Components":"Victus + Mortuus","Found in":"Soul Sand, Ghast Tear, Zombie Head"},"Venenum":{"Aspect Symbol":"Venenum","Aspect Name":"Venenum(Veh-NAY-num)Poison","Components":"Aqua + Mortuus","Found in":"Spider eye, Quicksilver, Poisoned potato, Potion of Poison"},"Vitium":{"Aspect Symbol":"Vitium","Aspect Name":"Vitium(VIH-tee-um)Taint","Components":"Praecantatio + Perditio","Found in":"Taintacle, Fibrous taint, Tainted Goo"}},"Tier 4":{"Arbor":{"Aspect Symbol":"Arbor","Aspect Name":"Arbor(AR-bor)Wood","Components":"Aer + Herba","Found in":"Stick, Wood Planks, Wood Slabs, Tools, Wood Logs"},"Cognitio":{"Aspect Symbol":"Cognitio","Aspect Name":"Cognitio(Cog-NIH-ti-o)Thought, Mind","Components":"Terra + Spiritus","Found in":"Paper, Books, Zombie Brain, Knowledge Fragment, Experience Orb, Thaumonocon"},"Sensus":{"Aspect Symbol":"Sensus","Aspect Name":"Sensus(SEN-sus)Sense","Components":"Aer + Spiritus","Found in":"Ink Sac, Lapis Lazuli, Lapis Lazuli Ore, Lapis Lazuli Block, Rose, Flowers, Bone Meal, Carrots, Spider Eye, Cocoa Beans"}},"Tier 5":{"Humanus":{"Aspect Symbol":"Humanus","Aspect Name":"Humanus(Hoo-MAH-nus)Human","Components":"Bestia + Cognitio","Found in":"Rotten Flesh, Villager (mob), Skeleton (mob), Zombie (mob)"}},"Tier 6":{"Instrumentum":{"Aspect Symbol":"Instrumentum","Aspect Name":"Instrumentum(In-struh-MEN-tum)Tool","Components":"Humanus + Ordo","Found in":"Flint, Shovels and Axes (pre 4.1). Steel, Shovels and Axes (post 4.1.)"},"Lucrum":{"Aspect Symbol":"Lucrum","Aspect Name":"Lucrum(LOO-crum)Greed","Components":"Humanus + Fames","Found in":"Emerald, Diamond, Gold Ingot, Gold Block, Silver, Taintacle"},"Messis":{"Aspect Symbol":"Messis","Aspect Name":"Messis(MESS-iss)Crop","Components":"Herba + Humanus","Found in":"Wheat, Bread, Potatoes, Carrot, Apple, Barley"},"Perfodio":{"Aspect Symbol":"Perfodio","Aspect Name":"Perfodio(Pehr-FOH-di-o)Dig, Mine","Components":"Humanus + Terra","Found in":"Pickaxes"}},"Tier 7":{"Fabrico":{"Aspect Symbol":"Fabrico","Aspect Name":"Fabrico(FAH-bri-co)Create, Build","Components":"Humanus + Instrumentum","Found in":"Crafting Table, Anvil, Wool, Cooked Chicken, Steak, Bed"},"Machina":{"Aspect Symbol":"Machina","Aspect Name":"Machina(MAH-ki-na)Machine","Components":"Motus + Instrumentum","Found in":"Button, Lever, Door, Redstone, Pressure Pads, Hopper, Redstone Comparator, Redstone repeater"},"Meto":{"Aspect Symbol":"Meto","Aspect Name":"Meto(MEH-to)Harvest, Reap","Components":"Messis + Instrumentum","Found in":"Shears, Hoes"},"Pannus":{"Aspect Symbol":"Pannus","Aspect Name":"Pannus(PAN-nus)Fabric","Components":"Instrumentum + Bestia","Found in":"Leather, Wool, String, Bed"},"Telum":{"Aspect Symbol":"Telum","Aspect Name":"Telum(TAY-lum)Weapon","Components":"Instrumentum + Perditio","Found in":"Bow, Arrow, Sword"},"Tutamen":{"Aspect Symbol":"Tutamen","Aspect Name":"Tutamen(Tu-TAH-men)Armor","Components":"Instrumentum + Terra","Found in":"Helmets, Chest, Leggings, Boots, Leather, Potion of Fire Resistance"}}} 
}

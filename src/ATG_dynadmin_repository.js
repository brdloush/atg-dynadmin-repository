// ==UserScript==
// @name       ATG_dynadmin_repository
// @namespace  http://github.com/brdloush/atg-dynadmin-repository/
// @version    0.19

// @description  Script that adds useful new buttons to ATG dyn/admin/nucleus UI + provides XML colorization to results of repository queries.  
// @match      http://*/dyn/admin/nucleus/*Repository*
// @match      http://*/dyn/admin/nucleus/*ProductCatalog*
// @match      http://*/dyn/admin/nucleus/*PriceLists*
// @match      http://*/dyn/admin/nucleus/atg/registry/ContentRepositories/*
// @copyright  2013 Brdloush
// @require       http://code.jquery.com/jquery-1.8.3.min.js
// @require       http://yandex.st/highlightjs/7.3/highlight.min.js 
// @require       http://cdn.craig.is/js/mousetrap/mousetrap.min.js
// @require       http://cdnjs.cloudflare.com/ajax/libs/codemirror/3.21.0/codemirror.js
// @require       http://cdnjs.cloudflare.com/ajax/libs/codemirror/3.21.0/mode/xml/xml.js
// @require       http://cdn.jsdelivr.net/simplemodal/1.4.4/jquery.simplemodal.min.js
// @require       http://cdnjs.cloudflare.com/ajax/libs/Chart.js/0.2.0/Chart.min.js
// @grant    GM_addStyle
// @updateUrl     http://github.com/brdloush/atg-dynadmin-repository/blob/master/src/ATG_dynadmin_repository.js

// ==/UserScript==
// 0.19 - item descriptors in table are now being sorted by item descriptor name
// 0.18 - Alt+o now contains a list of user's favourite repositories (ProductCatalog and OrderRepository by default). User can add/remove favourites,
//        the list of favourites it's saved in local storage.
// 0.17 - clickable references should now work even for properties which are inherited from supertypes (eg. product) to subtypes (yourCustomProduct) 
// 0.16 - Alt+o opens a modal window containing repositories listed in ContentRepositories component
//      - Repository cache-miss percentage statistics graphs at the bottom of the page
//      - Clickable references to properties which use  "component-item-type" or "item-type"
//      - Icons instead of text for buttons (in order to save some space)
//      - ... and the code is a huge mess now ! :-)
// 0.15 automatic updates
// 0.14 Alt+r = jump to XML results 
// 0.13 - XML syntax highlighting for editor !
// 0.12 - added keyboard shortcuts: Alt+x = jump to xml editor. Alt+t = jump to table with item descriptors. Alt+S = jump to statistics.
// 0.11 - if there are errors present on page (after rql submit), the window jumps to errors instead of results. Added "title" to each item descriptor name - currently it contains primary-table-name of that item descriptor. 
// 0.10 - __NULL__ is now added as a default value in <add-item> statements
// 0.9 - added hints on buttons..
// 0.8 - Colorization of repository XML definition 
// 0.7 - Ctrl+Enter combination submits the query form 
// 0.6 - added <add-item> template button ! When clicked, it only adds <set-property>  for required properties, shift-click will add all properties.
// 0.5 - shift+click now works for query items button. If you shift+click the button, the query will be executed immediatelly. 
// 0.4 - 1 new button (generate SQL)
// 0.3 - 2 new buttons (query with limit, remove-item) + code cleanup 
// 0.2 - query links turned to green buttons, added restart and invalidate repository buttons to the top of the page
// 0.1 - initial release : query links for each item descriptor, jumping directly to results of queries

// 
performPageLoadInitialization();


/**
 * Performs initialization of all the customizations, loading of CSSs etc.
 */
function performPageLoadInitialization() {
    // add custom CSS
    GM_addStyle(".simplemodal-data { color: black !important; background-color: #ddd !important; } \
#simplemodal-container a { color: black !important;}             \
");
    
    // import highlight.js CSS 
    useCSS('http://yandex.st/highlightjs/7.3/styles/github.min.css');
    useCSS('http://cdnjs.cloudflare.com/ajax/libs/codemirror/3.20.0/codemirror.css')
    useCSS('https://simplemodal.googlecode.com/svn-history/r257/trunk/simplemodal/demo/css/basic.css')
    useCSS('http://netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css')
}

/**
 * Returns a JSON object containing saved repository locations etc.
 */
function getStoredConfig() {
    var config = localStorage.getItem('brdloush.atg-dynadmin-repository.storedConfig');
    if ( config !== null ) {
        return  JSON.parse(config);
    } else {
        config = {};
        preFillBasicStoredConfig(config);
        storeConfig(config);
        return config;
    }
}

/**
 * Stores a config with saved repository locations etc
 */
function storeConfig(storedConfig) {
    localStorage.setItem('brdloush.atg-dynadmin-repository.storedConfig',JSON.stringify(storedConfig));
}

/**
 * Fills some default values insto empty stored config object;
 */
function preFillBasicStoredConfig(storedConfig) {
    storedConfig['storedRepositories'] = [
        {name:'ProductCatalog', path:'/atg/commerce/catalog/ProductCatalog'},
        {name:'OrderRepository', path:'/atg/commerce/order/OrderRepository'}
    ];
}

/**
 * Adds new saved repository and saves it to local storage.
 */
function addSavedRepository(name, path) {
    var config = getStoredConfig();
    config.storedRepositories.push({name:name, path:path});
    storeConfig(config);
}

/**
 * 
 */
function removeSavedRepository(repositoryPath) {
    var config = getStoredConfig();
    var newStoredRepositories = [];
    for (i=0;i<config.storedRepositories.length;i++) {
        debugger;
        if (config.storedRepositories[i].path != repositoryPath) {
            newStoredRepositories.push(config.storedRepositories[i]);
        }
    }
    config.storedRepositories = newStoredRepositories;
    storeConfig(config);
    
}


/**
 * Helper function that allows to set attributes (specified as JSON) to specified object.
 */
function setObjectAttributes(el, attrs) {
    for(var key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

/**
 * Imports CSS into page (adds the css node to html head)
 */
function useCSS(url) {
    var cssNode = document.createElement('link');
    setObjectAttributes(cssNode, {type:'text/css', rel:'stylesheet', href:url, media:'screen'});
    document.getElementsByTagName('head')[0].appendChild(cssNode);
}

// global variables for SHIFT and CTRL keys
var shiftPressed = false;
var ctrlPressed = false;
$(document).bind('keyup keydown', function(e){shiftPressed = e.shiftKey; ctrlPressed = e.ctrlKey;} );

/**
 * Parses current URL and returns a value of specified parameter. 
 */
$.getParamFromCurrentURL = function(name){
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
        return null;
    }
    else{
        return results[1] || 0;
    }
}

/**
 * Opens a repository chooser modal window.
 */
function repositoryChooserModal() {
    
    var storedConfig = getStoredConfig();
    
    
    var modalContent = $("<div id='simplemodal-container' style='height:100%;' />");
    
    var innerDiv = $('<div id="repositoryChooser"/>');
    innerDiv.appendTo(modalContent);
    
    
    var ulContent = $("<ul/>");
    ulContent.appendTo(modalContent);
    for (i=0;i<storedConfig.storedRepositories.length;i++) {
        var repository = storedConfig.storedRepositories[i];
        var liContent = $('<li/>')
        liContent.appendTo(ulContent);
        var span = $('<span/>');
        span.appendTo(liContent);
        var href = $('<a/>').attr('href','/dyn/admin/nucleus/'+repository.path).text(repository.name);
        var hrefDelete = $('<a><button style="background-color: #EEAAAA;"><i class="fa fa-times"/></button></a>').attr('repoPath',repository.path);
        href.appendTo(span);
        hrefDelete.appendTo(span);
        hrefDelete.click(function(e) {
            var repositoryPath = $(e.target).parents('a[repoPath]').attr('repoPath');
            removeSavedRepository(repositoryPath);
            $(e.target).parents().find('.simplemodal-close').click();
        });
        
    }
    
    var addNewDiv = $('<div><strong>Add new favourite component: </strong><br/>Name:<input name="name"/>, Path:<input name="path"/> </div>');
    var hrefCreate = $('<a><button style="background-color: #AAEEAA;"><i class="fa fa-flash"/></button></a>');
    hrefCreate.appendTo(addNewDiv);
    hrefCreate.click(function(e) {
        debugger;
        var parentDiv = $(e.target).closest('div');
        var name = parentDiv.find('input[name=name]').val();
        var path = parentDiv.find('input[name=path]').val();
        addSavedRepository(name,path);
        $(e.target).parents().find('.simplemodal-close').click();
    });
    
    addNewDiv.appendTo(modalContent)
    $.modal(modalContent, {minHeight: "500px"});
}

function applyQueryOneTemplate(itemDescriptorName, id) {
    var textelement = $('textarea[name=xmltext]');
    textelement.attr('value', '<query-items item-descriptor="'+itemDescriptorName+'"> \n ID IN {"'+id+'"} \n </query-items>');
    textelement.attr('id', 'querytextelement');
    synchronizeEditor();
    $('form').submit();
}


function applyQueryTemplate(itemDescriptorName, rangeString, focusOnTextElement) {
    var textelement = $('textarea[name=xmltext]');
    textelement.attr('value', '<query-items item-descriptor="'+itemDescriptorName+'"> \n ALL '+rangeString+'\n </query-items>');
    textelement.attr('id', 'querytextelement');
    synchronizeEditor();
    if (shiftPressed) {
        $('form').submit();
        return;
    }    
    if (focusOnTextElement) {
        document.location.href="#querytextelementjump";
    }
}

function applyRemoveTemplate(itemDescriptorName, focusOnTextElement) {
    var textelement = $('textarea[name=xmltext]');
    textelement.attr('value', '<remove-item item-descriptor="'+itemDescriptorName+'" id=""/>');
    textelement.attr('id', 'querytextelement');
    synchronizeEditor();
    
    if (focusOnTextElement) {
        document.location.href="#querytextelementjump";
    }
}

function applyAddTemplate(itemDescriptorName, focusOnTextElement, urlForProperties, onlyRequiredProperties) {
    
    $.get(urlForProperties, function( data ) {
        htmlData = $(data);
        var resultQuery = '<add-item item-descriptor="'+itemDescriptorName+'" id="">';
        
        var tableWithProperties = htmlData.find('th:contains("property type")').closest('table');
        var propertyRows =  $(tableWithProperties).find('tr');
        propertyRows.each(function(i, e) {
            //    $(e).css('background-color', 'yellow');
            var tds = $(e).find('td');
            var name = $(e).find('td:nth-child(1)').text();
            name = name.substring(name.lastIndexOf("(")+1,name.lastIndexOf(")"));
            
            
            var required = $(e).find('td:nth-child(6)');
            if (name.length > 0) {    
                if (!onlyRequiredProperties || (required.text() == 'true')) {
                    var setProperty = '<set-property name="'+name+'"><![CDATA[__NULL__]]></set-property>';
                    resultQuery+="\n";
                    resultQuery+=setProperty;    
                }
                
                
            }
        });
        resultQuery += "\n</add-item>";
        
        var textelement = $('textarea[name=xmltext]');
        textelement.attr('value', resultQuery);  
        textelement.attr('id', 'querytextelement');
        synchronizeEditor();
        
    });
    
    if (focusOnTextElement) {
        document.location.href="#querytextelementjump";
    }
}

var itemProperties = {};
var itemTypes = {};

function addSuperTypePropertiesToItemTypeArray(targetItemDescriptor, currentSuperType, repositoryXml, repoPath) {
    var itemDescriptorElement = $(repositoryXml).find("item-descriptor[name="+currentSuperType+"]");
    var props = itemDescriptorElement.find("property[component-item-type],property[component-item-type]");
    
    props.each(function(i, prop) {
        addLinkedPropertyToItemType(prop, repoPath, targetItemDescriptor);
    });
    
    if ($(itemDescriptorElement).attr('super-type')) {
        var superType= ($(itemDescriptorElement).attr('super-type'));
        addSuperTypePropertiesToItemTypeArray(targetItemDescriptor, superType, repositoryXml, repoPath);
    }
    
}

function addLinkedPropertyToItemType(prop, repoPath, itemDescriptorNameOverride) {
    var itemDescriptorElement = $(prop).parent();
    var itemDescriptorName =  itemDescriptorElement.attr('name');
    var propName = $(prop).attr('name');
    
    if (itemDescriptorNameOverride) {
        itemDescriptorName = itemDescriptorNameOverride;
    }
    var propKey=itemDescriptorName+"->"+propName;
    var repository=$(prop).attr('repository');
    if (typeof repository === 'undefined') {
        repository = repoPath;
    }
    itemProperties[propKey]=repository;
    var itemType = $(prop).attr('item-type'); 
    if ($(prop).attr('component-item-type')) {
        itemType = $(prop).attr('component-item-type'); 
    };
    //
    
    itemTypes[propKey]=itemType;
}

superTypes = {};

// ShopSku -> tczSku
// tczSku -> sku

function addSupertypesRecursivelyForDescriptor(superTypesMap, newlyDerivedMap, childDescriptor, currentlyProcessedParent) {
    newlyDerivedMap[childDescriptor].push(currentlyProcessedParent);
    var superTypesMapKeys = $.map(superTypesMap, function(value, key) { return key;});
    var childOfCurrentlyProcessedParent = superTypesMap[currentlyProcessedParent];
    if (typeof childOfCurrentlyProcessedParent != 'undefined' && $.inArray(childOfCurrentlyProcessedParent, superTypesMapKeys)) {
        childOfCurrentlyProcessedParent = childOfCurrentlyProcessedParent[0];
        //console.log('going even deeper from '+currentlyProcessedParent+' to '+childOfCurrentlyProcessedParent);
        addSupertypesRecursivelyForDescriptor(superTypesMap, newlyDerivedMap, childDescriptor, childOfCurrentlyProcessedParent);
    } 
}

function addSupertypesRecursively(superTypesMap) {
    var superTypesMapKeys = $.map(superTypesMap, function(value, key) { return key;});
    var newlyDerivedMap = {};
    $.map(superTypesMap, function(value, key) {
        newlyDerivedMap[key] = [];
        var firstValue= value[0];
        if ($.inArray(firstValue,superTypesMapKeys)) {
            //            console.log('going recursive for item '+key+'='+firstValue);
            addSupertypesRecursivelyForDescriptor(superTypesMap, newlyDerivedMap, key, firstValue);
        } else {
            newlyDerivedMap[key] = [firstValue];
        }
    });  
    return newlyDerivedMap;
}


function addTableInfo() {
    var urlForDescriptors =  $('a:contains("Examine Repository Template Definition")').attr('href');
    var repoPath = urlForDescriptors.replace('/dyn/admin/nucleus',''); repoPath = repoPath.substring(0, repoPath.lastIndexOf("/"))
    
    $.get(urlForDescriptors, function( data ) {
        var htmlData = $(data);
        
        var repositoryXml = $(htmlData.find('pre').first().text());
        
        // find out  parent item-types for subtyped items
        repositoryXml.find('item-descriptor[super-type]').each(function(i, item) {
            $item = $(item);
            var thisItemDescriptorName = $item.attr('name'); 
            var descriptorNameOfSupertype = $item.attr('super-type');
            superTypes[thisItemDescriptorName] = [descriptorNameOfSupertype];
        }); 
        // now let's recursively calculate all parents of subtyped items
        superTypes = addSupertypesRecursively(superTypes);
        
        
        var propertiesWithItemType = repositoryXml.find('property[item-type],property[component-item-type]');
        // as we're parsing this valuable table info, we'll also parse a item->property->repository
        propertiesWithItemType.each(function(i, prop) {
            addLinkedPropertyToItemType(prop, repoPath);
            
            //                var itemDescriptorElement = $(prop).parent();
            //                var itemDescriptorName =  itemDescriptorElement.attr('name');
            //                
            //                var superType = $(itemDescriptorElement).attr('super-type');
            //                if (superType) { 
            //                    addSuperTypePropertiesToItemTypeArray(itemDescriptorName, superType, repositoryXml, repoPath);
            //                }
            
        });
        
        applySubtypingOnItemTypes();
        
        
        var primaryTablesOfItemDescriptors = {};
        $(htmlData.find('pre').first().text()).find('item-descriptor').each(function(index, element)  { 
            var itemDescriptorName = $(element).attr('name');
            var primaryTableName = $(element).find('table[type=primary]').attr('name');
            primaryTablesOfItemDescriptors[itemDescriptorName]=primaryTableName;
        } );
        
        
        for(var descriptorName in primaryTablesOfItemDescriptors)
        {
            var tableName = primaryTablesOfItemDescriptors[descriptorName];
            $('th[item-descriptor="'+descriptorName+'"]').attr('title', 'primary-table: '+tableName);
        }
        
        makeAddItemRefsClickable();
    });
    
}

function findSubtypesOfItemDescriptor (itemDescriptor) {
    var result = [];
    $.map(superTypes, function(value, key) {
        if ($.inArray(itemDescriptor, value) == 1) {
            result.push(key);
        }
    });
    return result;
}

function applySubtypingOnItemTypes() {
    var newItemTypes = {};
    $.map(itemTypes, function(value, key) {
        newItemTypes[key]=value;
        var itemDescriptorName  = key.substring(0,key.indexOf('->'));
        var propertyName= key.substring(key.indexOf('->')+2);
        
        var subtypesOfThisItemDescriptor = findSubtypesOfItemDescriptor(itemDescriptorName);
        $(subtypesOfThisItemDescriptor).each(function (i, subtype) {
            var newKey = subtype+'->'+propertyName;
            newItemTypes[newKey]=value;
            
            itemProperties[newKey]=itemProperties[key];
            
        });
    });
    
    itemTypes = newItemTypes;
}

// add new buttons each and every item-descriptor in the table
var listItemDescriptorsLink = $('a[name=listItemDescriptors]');
var table = listItemDescriptorsLink.parent().find('table');
var thElemsWithRepositoryItemNames = table.find('a').parent('td').parent('tr').find('th');

thElemsWithRepositoryItemNames.each(function(index, element)  {
    var itemDescriptorName = $(element).text();
    $(element).attr('item-descriptor', itemDescriptorName); // add an attribute for simple lookup
    var queryALL = $('<a name="queryAllButton" itemDescriptorName="'+itemDescriptorName+'"><button title="CLICK: generate QUERY-ITEM template,\nSHIFT-CLICK: generate&execute template" style="background-color: #99DD99;"><i class="fa fa-search"/> ALL</button></a>');
    var queryALLTop50 = $('<a name="queryAllTop50Button" itemDescriptorName="'+itemDescriptorName+'"><button title="CLICK: generate QUERY-ITEM template,\nSHIFT-CLICK: generate&execute template"  style="background-color: #99DD99;"><i class="fa fa-search"/> ALL (0-50)</button></a>');
    var removeItemButton = $('<a name="removeItemButton" itemDescriptorName="'+itemDescriptorName+'"><button title="CLICK: generate REMOVE template"  style="background-color: #EEAAAA;"><i class="fa fa-times"/></button></a>');
    var addItemButton = $('<a name="addItemButton" itemDescriptorName="'+itemDescriptorName+'"><button  title="CLICK: generate template with required properties only,\nSHIFT-CLICK: generate template with all properties" style="background-color: #99DD99;"><i style="height:100%;" class="fa fa-plus"/></button></a>');
    $(element).append(queryALL,queryALLTop50,removeItemButton,addItemButton);
});

// add behaviors to new item-descriptor buttons
$('a[name=queryAllButton]').click(function(event) {
    var linkThatWasClicked = $(event.target).parent();
    var itemDescriptorName = linkThatWasClicked.attr('itemDescriptorName');
    applyQueryTemplate(itemDescriptorName,"", true);
});

$('a[name=queryAllTop50Button]').click(function(event) {
    var linkThatWasClicked = $(event.target).parent();
    var itemDescriptorName = linkThatWasClicked.attr('itemDescriptorName');
    applyQueryTemplate(itemDescriptorName," RANGE 0 +50",true);
});

$('a[name=removeItemButton]').click(function(event) {
    var linkThatWasClicked = $(event.target).parent();
    var itemDescriptorName = linkThatWasClicked.attr('itemDescriptorName');
    applyRemoveTemplate(itemDescriptorName,true);
});

$('a[name=addItemButton]').click(function(event) {
    var linkThatWasClicked = $(event.target).parent();
    var itemDescriptorName = linkThatWasClicked.attr('itemDescriptorName');
    var urlForProperties = linkThatWasClicked.closest('tr').find('td:nth-child(2)').find('a').attr('href');
    var onlyRequiredProperties = !shiftPressed;
    applyAddTemplate(itemDescriptorName, true, urlForProperties, onlyRequiredProperties);
});

// create jump element for query input box
var textelement = $('textarea[name=xmltext]');
var newLink = $('<a name="querytextelementjump" ></a>');  
textelement.parent().parent().prepend(newLink);

// if there are some errors on page, create jump link
var errorsElement = $('p:contains("Errors:")');
if (errorsElement.length > 0) {
    errorsElement.html('<a name="errorsJumpLink"><p>Errors:</p></a>');
    document.location.href="#errorsJumpLink";
} else {
    //if the page currently contains results of query, jump to them!
    var resultsElement = $('h2:contains("Results")');
    if (resultsElement.length > 0) {
        resultsElement.html('<a name="resultsJumpLink">Results:</a>');
        document.location.href="#resultsJumpLink";
    }
} 

// add restart and invalidateCaches buttons to the top of the page
var restartLink = $('<a href="?invokeMethod=restart"><button style="background-color: #99DD99;"><i class="fa fa-power-off"/> Restart</button></a>');
var invalidateLink = $('<a href="?invokeMethod=invalidateCaches"><button style="background-color: #99DD99;"><i class="fa fa-refresh"/> Invalidate caches</button></a>');
var generateSQLLink = $('<a href="?invokeMethod=generateSQL"><button style="background-color: #99DD99;"><i class="fa fa-file-text-o"/> Generate SQL</button></a>');
var buttonDiv = $('<div/>');
buttonDiv.append(invalidateLink,restartLink,generateSQLLink);
$('h1').first().after(buttonDiv);

// submit RQL by ENTER
$(document).keypress(function(e) {
    if ((e.which == 10) && ctrlPressed) {
        $('form').submit();
    }
});

// colorize xml output and XML repository definition 
$('pre code').each(function(i, e) {hljs.highlightBlock(e)});
$('td:contains("XML value")').parent().find('pre').each(function(i, e) {hljs.highlightBlock(e)});

// 
$('textarea').css('width', '100%');


// mouse trap - keyboard shortcuts. Alt+x = jump to xml editor. Alt+t = jump to table with item descriptors. Alt+S = jump to statistics.
Mousetrap.bind('alt+x', function(e) {$('html,body').animate({scrollTop: $('div.CodeMirror').offset().top}); 
                                     $('textarea').each(function(i, e) {hljs.highlightBlock(e)});
                                     
                                    });
Mousetrap.bind('alt+t', function(e) {$('html,body').animate({scrollTop: table.offset().top});});
Mousetrap.bind('alt+s', function(e) {$('html,body').animate({scrollTop: $('h2:contains("Cache usage statistics")').offset().top});});
Mousetrap.bind('alt+r', function(e) {$('html,body').animate({scrollTop: $('a[name=resultsJumpLink]').offset().top});});
Mousetrap.bind('alt+o', function(e) { repositoryChooserModal() });

myCodeMirror = CodeMirror.fromTextArea($('textarea').get(0));
$('div.CodeMirror').css('background-color','#f8f8ff');
$('div.CodeMirror').css('border','solid 1px');

function synchronizeEditor() {
    var textelement = $('textarea[name=xmltext]');
    myCodeMirror.getDoc().setValue(textelement.attr('value'));
}

function makeAddItemRefsClickable() {
    // make <add-item> references to other repository items clickable 
    var allSetPropertyTags = $('span.title:contains("set-property")');
    allSetPropertyTags.each(function (i, node) {
        
        var propertyNameNode = $(node).next().next(); 
        var propertyName = propertyNameNode.text();
        propertyName=propertyName.substring(1);
        propertyName=propertyName.substring(0,propertyName.length-1);
        if (propertyName.trim().length > 0) {        
            
            var itemDescNameNode = propertyNameNode.parent().prevAll('span:contains("add-item"):first').find('span.value:first');
            var itemDescName = itemDescNameNode.text().substring(1);
            itemDescName=itemDescName.substring(0,itemDescName.length-1);
            var valueNode = propertyNameNode.parent().next();      
            var value=valueNode.text();
            
            var propKey = itemDescName+"->"+propertyName;
            var repositoryName = itemProperties[propKey];
            if (typeof repositoryName !== 'undefined') {
                var original = valueNode.text();
                var cleaned = original.replace('<![CDATA[','');
                var cleaned = cleaned.replace(']]>','')
                var tokens = cleaned.split(',');
                
                var newElements = $('<span/>');
                for (i=0;i<tokens.length;i++)  {
                    var token = tokens[i];
                    var itemType = itemTypes[propKey];
                    var url = '/dyn/admin/nucleus'+repositoryName+"?openItem="+itemType+"->"+token;
                    if (i>0) {
                        $("<span>,</span>").appendTo(newElements);
                    }
                    $('<a href="'+url+'">'+token+'</a>').css('background-color','#AAEEAA').appendTo(newElements);
                }
                valueNode.text('');
                newElements.appendTo(valueNode);
            }
            
            //        itemDescName = itemDescName.replace('"','').replace('"','');
            //    console.log(itemDescName+"->"+propertyName+" ==> "+ value);
        }
    });
    
}


addTableInfo();


var statRows=$('th:contains("weakEntryCount")').parent().parent().find('tr');
var itemDescTRs = statRows.find('td[colspan=18]:contains("item-descriptor=")').parent();

var itemLabels = [];
var itemMiss = [];
var queryMiss = [];
itemDescTRs.each(function (i, elem) {
    var idName = $(elem).text().replace('item-descriptor=', '');
    idName = idName.substring(0, idName.indexOf('cache-mode'));
    var itemCacheRow = $(elem).next();
    var queryCacheRow = $(elem).next().next();
    var a=0;
    itemLabels.push(idName);
    var itemMissVal = 100.0-itemCacheRow.find('td:nth-child(10)').text().replace('%','');
    var itemMissCnt = itemCacheRow.find('td:nth-child(9)').text();
    
    var queryMissVal = 100.0-queryCacheRow.find('td:nth-child(10)').text().replace('%','');
    var queryMissCnt = queryCacheRow.find('td:nth-child(9)').text();
    
    itemMiss.push(itemMissCnt > 0 ? itemMissVal : 0);
    queryMiss.push(queryMissCnt > 0 ? queryMissVal : 0);
}); 
//[1]).parent().next().next()


$('<h1 name="charts">charts</h1>').appendTo($('body'));

var canvasWidth = 100+(itemLabels.length*70);
$('<canvas id="chart" width="'+canvasWidth+'" height="400"></canvas>').appendTo($('body'))
var ctx = document.getElementById("chart").getContext("2d");

var data = {
    labels : itemLabels,
    datasets : [
        {
            fillColor : "rgba(220,220,220,0.5)",
            strokeColor : "rgba(220,220,220,1)",
            data : itemMiss
        },
        {
            fillColor : "rgba(151,187,205,0.5)",
            strokeColor : "rgba(151,187,205,1)",
            data : queryMiss
        }        
    ]
} 
var options = {};
new Chart(ctx).Bar(data,options);

Mousetrap.bind('alt+c', function(e) {$('html,body').animate({scrollTop: $('h1[name=charts]').offset().top});});


var currentUrl = window.location.href;
var openItem = decodeURIComponent($.getParamFromCurrentURL('openItem'));


if (typeof openItem !== 'undefined' && openItem !== 'null') {
    var baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/')+1);
    
    if (window.history.pushState) {
        //prevents browser from storing history with each change:
        window.history.pushState('', '', baseUrl);
    }
    
    var itemDescName = openItem.substring(0, openItem.indexOf('->'));
    var itemId= openItem.substring(openItem.indexOf('->')+2);
    
    applyQueryOneTemplate(itemDescName, itemId);
}

function sortItemDescriptorRowsByName() {
    var originalRows = $('th[item-descriptor]').parent('tr');
    var tbody = originalRows.parent('tbody');
    originalRows.remove();
    
    originalRows.sort(function(a,b) {
        var aName = $(a).find('th[item-descriptor]').attr('item-descriptor');
        var bName = $(b).find('th[item-descriptor]').attr('item-descriptor');
        
        if (aName < bName) {
            return -1;
        } else if (bName<aName) {
            return 1;
        } 
            return 0; 
    });
    
    originalRows.appendTo(tbody);
}

sortItemDescriptorRowsByName();

atg-dynadmin-repository
=======================

###What's this project?
Simple user script for GreaseMonkey (firefox) or TamperMonkey (google chrome) plugins, which adds a couple of useful and user-friendly features
to repository pages of "Dynamo admin" http UI of ATG platform. (think *localhost:8080/dyn/admin/nucleus/*)

**_If you don't feel like reading this readme.md, I have a spoiler: there are [screenshots on the very end of this readme](#screenshots) ;-)_**

###What features are added?

1. New **repository-level based UI-buttons**, allowing you to quickly perform following actions:
  * Invalidate repository caches
  * Restart repository
  * Generate SQL (DDL) for the repository
    
    > Note: So you basically don't need to hunt-down the "invalidateCaches" method over and over again

2. New **repository-item-level based UI buttons** allowing you to quickly:
  * generate \<query-items\> script template for specified repository item 
  * generate \<add-item\> script template for specified repository item
  * generate \<remove-item\> script template for specified repository item
  * generate \<add-item\> script template for specified repository item - including \<set-property\> tags for (either just required or all) item's properties  

    > Because nobody really likes to type stuff like  \<query-items item-descriptor="category"\>ALL\</query-items\> over and over again.. 
    
    > For all of these buttons, there's a "secondary" mode: if you shift-click the button : eg. queries will be performed immediatelly after the click

3. Whenever you execute a query, the browser will jump to the "Results:" section of the page. 
  >No more annoying scrolling / searching!

4. Some new useful keyboard shortcuts:
  * Alt+x = jump to XML (repository query) editor
  * Alt+t = jump to the start of repository Table (the one containing items & their properties)
  * Alt+s = jump to repository cache Statistics
  * Alt+r = jump to query Results
  * Alt+o = open repository choOser modal window (user can manage his own "bookmarks")
  * Alt+c = jump to Charts with cache hit/miss
  * Ctrl+Enter (in XML editor) = execute the query

5. XML syntax highlighting 
  * for query editor (XML-highlight-as-you-type)
  * for query results
  * for "Examine Repository Template Definition" page 
   
6. Repository cache-miss percentage statistics 
  * (not so) fancy graphs at the bottom of the page (arguably useful)

7. Clickable values in query results
  * if the property behind \<set-property\> tag in query results is a reference to another repository item (item-type or component-item-type) then the value will be clickable. 
  * If you click the link, it will get you to the referenced item
   

###FAQ
  * **Q**: Why is the quality of the code so terrible ? 
    * It was written "hack-until-it-somehow-works" approach
    * Features were randomly added without any planning.
    * I'm not a JS developer
    * I don't have time for complete rewrite (the code deserves it!)
    
  * **Q**: What if I just have some good idea about another cool feature?
  
    * Then don't be shy to tell me. If it will sound good (and will be easy-enough to implement) I might add it. Even better: you might implement it and share it ;-)

  * **Q**: Can I commit changes, fork this,..?
    
    * Sure! Any help is appriciated.

### <a name="screenshots"></a>Screenshots:
* #####Repository-level and repository-item-level buttons:
  * ![Repository-level and repository-item-level buttons:](https://raw.githubusercontent.com/brdloush/atg-dynadmin-repository/master/doc/images/helper-buttons.png)

* #####XML syntax highlighting of results (incliding clickable items):
  * ![XML syntax highlighting of results (incliding clickable items):](https://raw.githubusercontent.com/brdloush/atg-dynadmin-repository/master/doc/images/search-result.png)

* #####XML syntax highlighting:
  * ![XML syntax highlighting:](https://raw.githubusercontent.com/brdloush/atg-dynadmin-repository/master/doc/images/xml-highlighting.png)



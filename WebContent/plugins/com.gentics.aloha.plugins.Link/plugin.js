/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/
/**
 * register the plugin with unique name
 */
GENTICS.Aloha.Link = new GENTICS.Aloha.Plugin('com.gentics.aloha.plugins.Link');

/**
 * Configure the available languages
 */
GENTICS.Aloha.Link.languages = ['en', 'de'];

/**
 * Default configuration allows links everywhere
 */
GENTICS.Aloha.Link.config = ['a'];

// TODO register those parameters for Link plug-in. 
// Update code then where settings.

/**
 * all links that match the targetregex will get set the target
 * e.g. ^(?!.*aloha-editor.com).* matches all href except aloha-editor.com
 */
GENTICS.Aloha.Link.targetregex = '';

/**
  * this target is set when either targetregex matches or not set
  * e.g. _blank opens all links in new window
  */
GENTICS.Aloha.Link.target = '';

/**
 * all links that match the cssclassregex will get set the css class
 * e.g. ^(?!.*aloha-editor.com).* matches all href except aloha-editor.com
 */
GENTICS.Aloha.Link.cssclassregex = '';

/**
  * this target is set when either cssclassregex matches or not set
  */
GENTICS.Aloha.Link.cssclass = '';

/**
 * Initialize the plugin
 */
GENTICS.Aloha.Link.init = function () {
	if (GENTICS.Aloha.Link.settings.targetregex != undefined)
		GENTICS.Aloha.Link.targetregex = GENTICS.Aloha.Link.settings.targetregex;
	if (GENTICS.Aloha.Link.settings.target != undefined)
		GENTICS.Aloha.Link.target = GENTICS.Aloha.Link.settings.target;
	if (GENTICS.Aloha.Link.settings.cssclassregex != undefined)
		GENTICS.Aloha.Link.cssclassregex = GENTICS.Aloha.Link.settings.cssclassregex;
	if (GENTICS.Aloha.Link.settings.cssclass != undefined)
		GENTICS.Aloha.Link.cssclass = GENTICS.Aloha.Link.settings.cssclass;
		
	this.initButtons();
	this.subscribeEvents();
};

/**
 * Initialize the buttons
 */
GENTICS.Aloha.Link.initButtons = function () {
	var that = this;

	// format Button
	this.formatLinkButton = new GENTICS.Aloha.ui.Button({
		'iconClass' : 'GENTICS_button GENTICS_button_a',
		'size' : 'small',
		'onclick' : function () { that.formatLink(); },
		'tooltip' : this.i18n('button.addlink.tooltip'),
		'toggle' : true
	});
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.continuoustext',
		this.formatLinkButton,
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.format'),
		1
	);

	// insert Link
	this.insertLinkButton = new GENTICS.Aloha.ui.Button({
		'iconClass' : 'GENTICS_button GENTICS_button_a',
		'size' : 'small',
		'onclick' : function () { that.insertLink( false ); },
		'tooltip' : this.i18n('button.addlink.tooltip'),
		'toggle' : false
	});
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.continuoustext',
		this.insertLinkButton,
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.insert'),
		1
	);

	// add the new scope for links
	GENTICS.Aloha.FloatingMenu.createScope(this.getUID('link'), 'GENTICS.Aloha.continuoustext');

	this.srcFieldButton = new GENTICS.Aloha.Link.SrcField();

	// add the input field for links
	GENTICS.Aloha.FloatingMenu.addButton(
		this.getUID('link'),
		this.srcFieldButton,
		this.i18n('floatingmenu.tab.link'),
		1
	);

	// add a button for removing the currently set link
	GENTICS.Aloha.FloatingMenu.addButton(
		this.getUID('link'),
		new GENTICS.Aloha.ui.Button({
			// TODO use another icon here
			'iconClass' : 'GENTICS_button GENTICS_button_a_remove',
			'size' : 'small',
			'onclick' : function () { that.removeLink(); },
			'tooltip' : this.i18n('button.removelink.tooltip')
		}),
		this.i18n('floatingmenu.tab.link'),
		1
	);
};

/**
 * Subscribe for events
 */
GENTICS.Aloha.Link.subscribeEvents = function () {
	var that = this;

	// add the event handler for selection change
	GENTICS.Aloha.EventRegistry.subscribe(GENTICS.Aloha, 'selectionChanged', function(event, rangeObject) {
		
		// show/hide the button according to the configuration
		var config = that.getEditableConfig(GENTICS.Aloha.activeEditable.obj);

		if ( jQuery.inArray('a', config) != -1) {
			that.formatLinkButton.show();
			that.insertLinkButton.show();
		} else {
			that.formatLinkButton.hide();
			that.insertLinkButton.hide();
		}
		
		// check whether the markup contains a link
		var foundMarkup = rangeObject.findMarkup(function () {
			return this.nodeName.toLowerCase() == 'a';
		}, GENTICS.Aloha.activeEditable.obj);

		if (foundMarkup) {
			// link found
			that.formatLinkButton.setPressed(true);
			GENTICS.Aloha.FloatingMenu.setScope(that.getUID('link'));
			that.srcFieldButton.setAnchor(foundMarkup);
		} else {
			// no link found
			that.formatLinkButton.setPressed(false);
			that.srcFieldButton.setAnchor(null);
		}

		// TODO this should not be necessary here!
		GENTICS.Aloha.FloatingMenu.doLayout();
	});
};

/**
 * Check wheter inside a link tag 
 * @param {GENTICS.Utils.RangeObject} range range where to insert the object (at start or end)
 * @return markup
 * @hide
 */
GENTICS.Aloha.Link.findLinkMarkup = function ( range ) {
	if ( typeof range == 'undefined' ) {
		var range = GENTICS.Aloha.Selection.getRangeObject();	
	}
	return range.findMarkup(function() {
		return this.nodeName.toLowerCase() == 'a';
	}, GENTICS.Aloha.activeEditable.obj);
};

/**
 * Format the current selection or if collapsed the current word as link.
 * If inside a link tag the link is removed.
 */
GENTICS.Aloha.Link.formatLink = function () {
	var that = this;

	var range = GENTICS.Aloha.Selection.getRangeObject();
	if (GENTICS.Aloha.activeEditable) {
		var foundMarkup = that.findLinkMarkup( range ); 
		if ( foundMarkup ) {
			that.removeLink();
		} else {
			that.insertLink();
		}
	}
};

/**
 * Insert a new link at the current selection. When the selection is collapsed,
 * the link will have a default link text, otherwise the selected text will be
 * the link text.
 */
GENTICS.Aloha.Link.insertLink = function ( extendToWord ) {
	
	// activate floating menu tab
	GENTICS.Aloha.FloatingMenu.userActivatedTab = this.i18n('floatingmenu.tab.link');

	// if selection is collapsed then extend to the word.
	var range = GENTICS.Aloha.Selection.getRangeObject();
	if (range.isCollapsed() && extendToWord != false) {
		GENTICS.Utils.Dom.extendToWord(range);
	}
	if ( range.isCollapsed() ) {
		// insert a link with text here
		var linkText = this.i18n('newlink.defaulttext');
		var newLink = jQuery('<a href="#">' + linkText + '</a>');
		GENTICS.Utils.Dom.insertIntoDOM(newLink, range, jQuery(GENTICS.Aloha.activeEditable.obj));
		range.startContainer = range.endContainer = newLink.contents().get(0);
		range.startOffset = 0;
		range.endOffset = linkText.length;
	} else {
		GENTICS.Utils.Dom.addMarkup(range, jQuery('<a href="#"></a>'), false);
	}
	range.select();
	this.srcFieldButton.focus();
};

/**
 * Remove an a tag if inside any.
 */
GENTICS.Aloha.Link.removeLink = function () {
	var that = this;

	var range = GENTICS.Aloha.Selection.getRangeObject();
	var foundMarkup = that.findLinkMarkup(); 
	if ( foundMarkup ) {
		// remove the link
		GENTICS.Utils.Dom.removeFromDOM(foundMarkup, range, true);
		// set focus back to editable
		GENTICS.Aloha.activeEditable.obj[0].focus();
		// select the (possibly modified) range
		range.select();
	}
};


/**
 * For now, we create our own extJS button implementation
 * TODO: move this into a 'generic' button in ui.js and use this generic button here to make the plugin independent from extJS
 */
Ext.ux.LinkSrcButton = Ext.extend(Ext.Component, {
	/**
	 * the jQuery object of the dom element of this button
	 */
	wrapper : null,

	/**
	 * the input field
	 */
	input : null,

	/**
	 * the anchor DOM object which is currently modified
	 */
	anchor : null,

	/**
	 * The onrender function renders a simple input field
	 */
	onRender : function () {
		var that = this;

		Ext.ux.LinkSrcButton.superclass.onRender.apply(this, arguments);
		this.wrapper = jQuery(this.el.dom);
		this.input = jQuery('<input id="GENTICS_Aloha_plugin_Link" type="text" style="width:300px">');
		
		// add a key handler for processing the input data
		this.input.keyup(function (event) {
			
			// update link href in any case 
			if (that.anchor) {
				if (that.input.val().length == 0) {
					jQuery(that.anchor).attr('href', '#');
				} else {
					jQuery(that.anchor).attr('href', that.input.val());
				}
			}
			
			// on ENTER or ESC leave the editing
			// TODO should ESC reset the value that was set initally?
			if (event.keyCode == 13 || event.keyCode == 27) {
				
				// Set focus to link element and select the object
				GENTICS.Aloha.activeEditable.obj[0].focus();
				GENTICS.Aloha.Selection.getRangeObject().select();
			
			} else {
				
				// TODO attach a link parser callback function with the link object
				// For now hardcoded attribute handling with regex.
				that.setAttribute(that.input.val(), 'target', GENTICS.Aloha.Link.targetregex, GENTICS.Aloha.Link.target);
				that.setAttribute(that.input.val(), 'class', GENTICS.Aloha.Link.cssclassregex, GENTICS.Aloha.Link.cssclass);
			}
		});
		
		this.wrapper.append(this.input);
		if (this.anchor) {
			this.input.val(jQuery(this.anchor).attr('href'));
		}
		if (this.getFocus) {
			this.getFocus = undefined;
			this.input.select();
			this.input.focus();
		}
	},

	// Private
	// Quick hack to allow attribute setting by regex
	setAttribute: function (input, attr, regex, value) {
		var that = this;

		if ( typeof value != 'undefined' ) {
			var setTarget = true;
			if ( typeof regex  != 'undefined' ) {
				var regex = new RegExp( regex );
				if ( input.match(regex) ) {
					setTarget = true;
				} else {
					setTarget = false;
				}
			}
			if ( setTarget ) {
				jQuery(that.anchor).attr(attr, value);
			} else {
				jQuery(that.anchor).removeAttr(attr);									
			}
		}

	},
	
	/**
	 * Set the anchor
	 */
	setAnchor : function (anchor) {
		this.anchor = anchor;
		if (this.input) {
			if (this.anchor) {
				this.input.val(jQuery(this.anchor).attr('href'));
			} else {
				this.input.val('');
			}
		}
	},

	/**
	 * focus the input field
	 */
	focus : function () {
		if (this.input) {
			this.input.select();
			this.input.focus();
		} else {
			this.getFocus = true;
		}
	}
});
/**
 * Register the button
 */
Ext.reg('linksrcbutton', Ext.ux.LinkSrcButton);

/**
 * This class extends the Button
 */
GENTICS.Aloha.Link.SrcField = function () {
	GENTICS.Aloha.ui.Button.apply(this, arguments);
};

//Inherit all methods and properties from GENTICS.Aloha.ui.Button
GENTICS.Aloha.Link.SrcField.prototype = new GENTICS.Aloha.ui.Button();

/**
 * Create a linksrcbutton
 */
GENTICS.Aloha.Link.SrcField.prototype.getExtConfigProperties = function() {
	return {
		xtype : 'linksrcbutton',
		id : this.id
	};
};

/**
 * Wrapper for setting the anchor
 */
GENTICS.Aloha.Link.SrcField.prototype.setAnchor = function (anchor) {
	if (this.extButton) {
		this.extButton.setAnchor(anchor);
	}
};

/**
 * Wrapper for setting the focus
 */
GENTICS.Aloha.Link.SrcField.prototype.focus = function () {
	if (this.extButton) {
		this.extButton.focus();
	}
};

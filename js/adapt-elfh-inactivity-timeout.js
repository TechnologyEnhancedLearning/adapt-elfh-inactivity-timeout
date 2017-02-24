/*
 * adapt-elfh-inactivity-timeout
 * License - 
 * Maintainers - Paul Steven <paul@mediakitchen.co.uk>
 */
define(function(require) {

    var Adapt = require('coreJS/adapt');
    var scorm = require('extensions/adapt-contrib-spoor/js/scorm');
    var jQueryUIRef = require('extensions/adapt-elfh-inactivity-timeout/js/jquery-ui.min');

    // If browser window is resized then re-adjust position of any dialogs

    $(window).resize(function() {
        $(".ui-dialog").position({
            my: "center",
            at: "center",
            of: window
        });
    });


    var InactivityTimeout = _.extend({

        resetTimer: null, // variable to hold the final 60 second setInterval result
        pollInterval: 10000, // How frequently to check for session expiration in milliseconds			
        expirationMinutes: 10, // How many minutes the session is valid for (this is overridden by AT value)
        intervalID: null,
        lastActivity: null,

        counterPeriod: 60, // Number of seconds the countdown starts on	
        dialog: {},

        initialize: function() {

            _.bindAll(this, "onResetTimer", "resetCountdown", "onKeepSessionOpen", "startResetCountdown", "sessInterval");

            this.lastActivity = new Date();
            this.setupEventListeners();
            this.dialog.counter = this.counterPeriod;
            this.setSessionInterval();


        },

        setupEventListeners: function() {


            this.listenToOnce(Adapt, "app:dataLoaded", this.setupModel);
            this.listenTo(Adapt, "remove", this.onResetTimer);


            $('body').on('click keypress mousewheel touchmove mousedown', this.onResetTimer);

        },



        onResetTimer: function(evt) {


            this.lastActivity = new Date();

        },



        setupModel: function() {

            this.model = Adapt.course.get('_inactivityTimeout');
            this.expirationMinutes = this.model._timeout;

        },



        setSessionInterval: function(settings) {

            this.intervalID = setInterval(this.sessInterval, this.pollInterval);

        },


        sessInterval: function(settings) {

            var now = new Date();
            var diff = now - this.lastActivity;
            var diffMins = (diff / 1000 / 60);

            if (diffMins >= Number(this.expirationMinutes - 1)) {

                this.onOpenDialog();
                clearInterval(this.intervalID);

            }


        },


        onOpenDialog: function() {

            var self = this;


            // add html
            $("<div/>", { id: "timeoutDialog", style: "margin:0 auto;" }).appendTo("body")

            $("<p/>", { text: "We've noticed that you have been on this page for over " + (this.expirationMinutes - 1) + " minutes." }).appendTo("#timeoutDialog");

            $("#timeoutDialog").append("<p>If you wish to keep the session open, select the OK button below.  Otherwise this session will close automatically in&nbsp;<strong><span id='resetCountdown' style='color: #dd0000;'>" + this.dialog.counter + "</span></strong>&nbsp;seconds.</p>");


            $("#timeoutDialog").dialog({
                    autoOpen: true,
                    modal: true,
                    closeOnEscape: false,
                    width: "60%",
                    title: "Session About To Close",
                    position: { my: "center", at: "center", of: window },
                    draggable: false,
                    resizable: false,
                    buttons: [{
                        text: "OK",
                        click: function() {
                            self.onKeepSessionOpen();
                        }
                    }],


                    open: function(event, ui) {

                        // hide the small close "x" in the window						
                        $(event.target).parent().find('.ui-dialog-titlebar-close').hide();

                        self.startResetCountdown();

                    },
                    close: function(event, ui) {

                        $(this).dialog('destroy').remove(); // remove() removes the #timeoutDialog div from the DOM
                    }
                }

            )
        },


        onKeepSessionOpen: function() {

            // Remove the dialog box that has the X second countdown
            $("#timeoutDialog").dialog("close");

            clearInterval(this.resetTimer);

            // Reset the counter value that appears on the countdown dialog box
            this.dialog.counter = this.counterPeriod;

            // Reset last activity value 
            this.lastActivity = new Date();

            // Start checking for idle
            this.setSessionInterval();
        },


        startResetCountdown: function() {

            this.resetTimer = setInterval(this.resetCountdown, 1000);
        },


        resetCountdown: function() {

            this.dialog.counter = this.dialog.counter - 1;

            if (this.dialog.counter <= 0) {

                // remove timer
                clearInterval(this.resetTimer);

                $("#timeoutDialog").dialog("close");

                // Close Drawer (Not really necessary)
                Adapt.trigger('drawer:closeDrawer');

                Adapt.offlineStorage.set("location", Adapt.location._currentId);
                scorm.commit();
                scorm.finish();

                this.onOpenTimeOutDialog();

            } else {

                // Update the html to show the updated countdown value
                $("#resetCountdown").html(this.dialog.counter);

            }

        },


        onOpenTimeOutDialog: function() {

            $("<div/>", { id: "endOfSessionTimeOutDialog", style: "margin:0 auto;" }).appendTo("body");

            $("<p/>", { text: this.model._promptMessage }).appendTo("#endOfSessionTimeOutDialog");

            $("#endOfSessionTimeOutDialog").dialog({
                    autoOpen: true,
                    modal: true,
                    closeOnEscape: false,
                    width: "80%",
                    title: "Session Timeout",
                    position: { my: "center", at: "center", of: window },
                    draggable: false,
                    resizable: false,
                    open: function(event, ui) {

                        // hide the small close "x" in the window						
                        $(event.target).parent().find('.ui-dialog-titlebar-close').hide();

                    },
                    close: function(event, ui) {

                        $(this).dialog('destroy').remove(); // remove() removes the #timeoutDialog div from the DOM
                    }
                }

            )

        },



    }, Backbone.Events);


    InactivityTimeout.initialize();

    return InactivityTimeout;

});
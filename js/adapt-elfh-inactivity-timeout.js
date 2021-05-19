/*
 * adapt-elfh-inactivity-timeout
 * License - GNU3
 * Maintainers - Paul Steven <paul@mediakitchen.co.uk> and Ian Robinson <ian@chilli-is.co.uk>
 */
define([
        'coreJS/adapt'
    ],
    function(Adapt) {

        var InactivityTimeout = _.extend({

                pollIntervalPeriod: 5000, // How frequently to check for session expiration in milliseconds			
                expirationMinutes: null, // How many minutes the session is valid for (this is overridden by AT value)
                activityCheckInterval: null,
                expirationMinutes = 15,

                lastActivityDateTime: new Date(),

                dialog: {
                    updateDialogCounterInterval: null,
                    max: 60,
                    value: 60
                },

                promptObject: {},

                initialize: function() {

                    _.bindAll(this, "setupEventListeners", "onResetTimer", "setupModel", "startActivityCheckInterval", "isUserInactive", "checkUserIsStillThere", "updateDialogCounter");

                    this.setupEventListeners();

                    Adapt.trigger('timeout:startActivityTimer');

                },

                setupEventListeners: function() {

                    this.listenTo(Adapt, "remove", this.onResetTimer);
                    this.listenTo(Adapt, "timeout:startActivityTimer", this.startActivityCheckInterval);

                    $('body').on('click keypress mousewheel touchmove mousemove mousedown', this.onResetTimer);

                },

                onResetTimer: function(evt) {

                    this.lastActivityDateTime = new Date();
                },



                startActivityCheckInterval: function() {

                    this.lastActivityDateTime = new Date();

                    // clear any old intervals running, just in case
                    clearInterval(this.dialog.updateDialogCounterInterval);
                    clearInterval(this.activityCheckInterval);

                    this.activityCheckInterval = setInterval(this.isUserInactive, this.pollIntervalPeriod);

                },

                // has the user not done anything for a while?
                isUserInactive: function() {

                    var now = new Date();
                    var diff = now - this.lastActivityDateTime;
                    var diffMins = (diff / 1000 / 60);

                    if (diffMins >= Number(this.expirationMinutes - 1)) {

                        clearInterval(this.activityCheckInterval);
                        this.checkUserIsStillThere();
                    }

                },

                checkUserIsStillThere: function() {

                    this.dialog.value = this.dialog.max;

                    this.promptObject = {
                        body: "<div class'customNotifyStyle' style='font-size:1.2em; text-align:center;'><p>You have been inactive for over 14 minutes.</p>" +
                            "<p>The session will timeout in <strong><span id='resetCountdown'>" + this.dialog.value + "</span></strong>&nbsp;seconds.</p>" +
                            "</div>",
                        _prompts: [{
                            promptText: "Do not timeout my session",
                            _callbackEvent: "timeout:startActivityTimer"
                        }],
                        _showIcon: false,
                        _isCancellable: false,
                        _classes: 'customNotifyStyle'
                    };

                    Adapt.trigger('notify:close');
                    Adapt.trigger('notify:prompt', this.promptObject);

                    // start timer interval for updating countdown in dialog box
                    this.dialog.updateDialogCounterInterval = setInterval(this.updateDialogCounter, 1000);

                },

                updateDialogCounter: function() {

                    this.dialog.value--;

                    if (this.dialog.value <= 0) {

                        // remove timer
                        clearInterval(this.dialog.updateDialogCounterInterval);

                        // Remove countdown timer message box
                        Adapt.trigger('notify:close', this.promptObject);

                        // Close Drawer (Not really necessary)
                        Adapt.trigger('drawer:closeDrawer');

                        var popupObj = {
                            body: "<div style='font-size:1.2em; text-align:center;'>" + this.model._timedOutMessage + "</div>",
                            _isCancellable: false,
                            _showIcon: false
                        };

                        Adapt.trigger('notify:prompt', popupObj);

                        Adapt.offlineStorage.set("location", Adapt.location._currentId);

                        // tell the other session components that this session has finished
                        Adapt.trigger('scorm:finish');

                    } else {

                        // Update the html to show the updated countdown value
                        $("#resetCountdown").html(this.dialog.value);

                    }


                }

            },
            Backbone.Events);

        InactivityTimeout.initialize();

        return InactivityTimeout;

    });
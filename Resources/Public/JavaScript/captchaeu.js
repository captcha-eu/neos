
(function () {
    'use strict';

    if (window.__captchaEUFormIntegrationInitialized) {
        return;
    }

    window.__captchaEUFormIntegrationInitialized = true;

    var SUBMIT_BUTTONS =
        'button[type="submit"]:not([formnovalidate]), ' +
        'input[type="submit"]:not([formnovalidate])';

    var SDK_WAIT_INTERVAL = 200;
    var SDK_MAX_ATTEMPTS = 50;

    function whenKROTReady(callback) {
        var attempts = 0;

        var timer = window.setInterval(function () {
            if (
                window.KROT &&
                typeof window.KROT.setup === 'function'
            ) {
                window.clearInterval(timer);
                callback();
                return;
            }

            attempts++;

            if (attempts >= SDK_MAX_ATTEMPTS) {
                window.clearInterval(timer);

                console.error(
                    'Captcha.eu: SDK did not become available.'
                );
            }
        }, SDK_WAIT_INTERVAL);
    }

    function getFormFromMarker(marker) {
        var fieldId = marker.getAttribute('data-field-id');

        if (!fieldId) {
            console.error(
                'Captcha.eu: Missing data-field-id.',
                marker
            );
            return null;
        }

        var input = document.getElementById(fieldId);

        if (!input) {
            console.error(
                'Captcha.eu: Form input not found:',
                fieldId
            );
            return null;
        }

        return input.closest('form');
    }

    function getWidgetSolutionField(form) {
        var widget = form.querySelector('.cpt_widget');

        if (!widget) {
            console.error(
                'Captcha.eu: Widget container not found in form:',
                form.id
            );
            return null;
        }

        var selector = widget.getAttribute('data-field-selector');

        if (!selector) {
            console.error(
                'Captcha.eu: Missing data-field-selector in widget:',
                form.id
            );
            return null;
        }

        var field;

        try {
            field = form.querySelector(selector);
        } catch (error) {
            console.error(
                'Captcha.eu: Invalid data-field-selector:',
                selector,
                error
            );
            return null;
        }

        if (!field) {
            console.error(
                'Captcha.eu: Solution field not found:',
                selector
            );
            return null;
        }

        return field;
    }

    function bindWidget(form) {
        var buttons = form.querySelectorAll(SUBMIT_BUTTONS);
        var solutionField = getWidgetSolutionField(form);

        if (!solutionField) {
            return;
        }

        buttons.forEach(function (button) {
            button.disabled = true;
        });

        var poll = window.setInterval(function () {
            if (solutionField.value !== '') {
                buttons.forEach(function (button) {
                    button.disabled = false;
                });

                window.clearInterval(poll);
            }
        }, SDK_WAIT_INTERVAL);
    }

    function init() {
        var markers = Array.prototype.slice.call(
            document.querySelectorAll('[data-captchaeu]')
        );

        if (!markers.length) {
            return;
        }

        var bindings = [];

        markers.forEach(function (marker) {
            var form = getFormFromMarker(marker);

            if (!form) {
                return;
            }

            if (form.dataset.captchaeuBound === '1') {
                return;
            }

            bindings.push({
                marker: marker,
                form: form,
                mode: marker.getAttribute('data-captchaeu'),
                publicKey: marker.getAttribute('data-key')
            });
        });

        if (!bindings.length) {
            return;
        }

        var publicKey = bindings[0].publicKey;

        if (!publicKey) {
            console.error('Captcha.eu: Public key is missing.');
            return;
        }

        var hasDifferentKey = bindings.some(function (item) {
            return item.publicKey !== publicKey;
        });

        if (hasDifferentKey) {
            console.error(
                'Captcha.eu: Different public keys found on the same page.'
            );
            return;
        }

        var hasWidget = bindings.some(function (item) {
            return item.mode === 'widget';
        });

        whenKROTReady(function () {
            window.KROT.setup(publicKey);

            bindings.forEach(function (item) {
                item.form.dataset.captchaeuBound = '1';

                if (item.mode === 'widget') {
                    bindWidget(item.form);
                } else {
                    window.KROT.interceptForm(item.form);
                }
            });

            if (hasWidget) {
                window.KROT.init();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

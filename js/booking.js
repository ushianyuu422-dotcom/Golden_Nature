(function () {
  'use strict';

  /* ---- Config ---------------------------------------------------------
     No backend is connected. To actually receive bookings, set an endpoint
     that accepts a JSON POST (e.g. a Formspree/Google Apps Script URL).     */
  var BOOKING_ENDPOINT = '';
  var FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100088833581768';
  var PHONE = '+63 920 313 5156';

  var COTTAGES = [
    { id: 'umbrella', name: 'Umbrella Cottage', img: 'img/c-umbrella.webp', day: 200, night: 300 },
    { id: 'kubo', name: 'Kubo Cottage', img: 'img/c-kubo.webp', day: 300, night: 350 },
    { id: 'regular', name: 'Regular Cottage', img: 'img/c-regular.webp', day: 400, night: 600 },
    { id: 'pavilion', name: 'Pavilion Cottage', img: 'img/c-pabillion.webp', day: 700, night: 1000 },
    { id: 'center', name: 'Central Cottage', img: 'img/c-central.webp', day: 1500, night: 2000 }
  ];
  var RATES = {
    Day: { adult: 50, child: 30 },
    Overnight: { adult: 100, child: 60 }
  };

  var $ = function (id) { return document.getElementById(id); };
  var peso = function (n) { return '\u20B1' + n.toLocaleString('en-PH'); };
  var state = { step: 1, adults: 1, children: 0, ticket: '', cottage: '' };
  var steps = [1, 2, 3, 4].map(function (n) { return $('step-' + n); });
  var stepperItems = document.querySelectorAll('.stepper li');

  /* ---- Setup ---- */
  function localToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  $('inp-date').min = localToday();

  $('cottage-grid').innerHTML = COTTAGES.map(function (c) {
    return '<label class="option cottage-opt">' +
      '<input type="radio" name="cottage" value="' + c.id + '">' +
      '<span class="option__box">' +
        '<img src="' + c.img + '" alt="" loading="lazy" width="900" height="675">' +
        '<span class="body"><h3>' + c.name + '</h3>' +
        '<span class="prices"><span data-p="Day">Day ' + peso(c.day) + '</span><span data-p="Overnight">Night ' + peso(c.night) + '</span></span></span>' +
      '</span>' +
      '<span class="tick"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></span>' +
    '</label>';
  }).join('');

  var q = new URLSearchParams(location.search).get('cottage');
  if (q && COTTAGES.some(function (c) { return c.id === q; })) {
    state.cottage = q;
    document.querySelector('input[name="cottage"][value="' + q + '"]').checked = true;
  }

  /* ---- Helpers ---- */
  function cottage() { return COTTAGES.filter(function (c) { return c.id === state.cottage; })[0]; }
  function cottagePrice() {
    var c = cottage();
    if (!c || !state.ticket) return null;
    return state.ticket === 'Overnight' ? c.night : c.day;
  }
  function total() {
    if (!state.ticket) return null;
    var r = RATES[state.ticket];
    return state.adults * r.adult + state.children * r.child + (cottagePrice() || 0);
  }
  function fmtDate(v) {
    if (!v) return '';
    return new Date(v + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ---- Live summary ---- */
  function updateSummary() {
    var c = cottage();
    var t = total();
    var rows = [
      ['Date', fmtDate($('inp-date').value) || '\u2014'],
      ['Guests', state.adults + ' adult' + (state.adults > 1 ? 's' : '') + (state.children ? ', ' + state.children + ' child' + (state.children > 1 ? 'ren' : '') : '')],
      ['Ticket', state.ticket ? (state.ticket === 'Day' ? 'Day Pass' : 'Overnight') : '\u2014'],
      ['Cottage', c ? c.name : '\u2014']
    ];
    $('summary-list').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') +
      '<div class="total"><dt>Estimated total</dt><dd>' + (t === null ? '\u2014' : peso(t)) + '</dd></div>';
    $('chip-total').textContent = t === null ? '' : 'Total ' + peso(t);
    document.querySelectorAll('.cottage-opt [data-p]').forEach(function (el) {
      el.classList.toggle('on', el.dataset.p === state.ticket);
    });
  }

  /* ---- Guest counters ---- */
  document.querySelectorAll('[data-adjust]').forEach(function (b) {
    b.addEventListener('click', function () {
      var type = b.dataset.adjust, delta = parseInt(b.dataset.delta, 10);
      var min = type === 'adults' ? 1 : 0;
      state[type] = Math.min(99, Math.max(min, state[type] + delta));
      $('out-' + type).textContent = state[type];
      updateSummary();
    });
  });
  document.querySelectorAll('input[name="ticket"]').forEach(function (r) {
    r.addEventListener('change', function () { state.ticket = r.value; clearError('err-ticket'); updateSummary(); });
  });
  $('cottage-grid').addEventListener('change', function (e) {
    if (e.target.name === 'cottage') { state.cottage = e.target.value; clearError('err-cottage'); updateSummary(); }
  });
  ['inp-name', 'inp-phone', 'inp-email', 'inp-date'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if ($(id).getAttribute('aria-invalid') === 'true') validateField(id);
      updateSummary();
    });
  });

  /* ---- Validation ---- */
  function setError(errId, msg, input) {
    var e = $(errId);
    if (msg) { e.textContent = msg; e.classList.add('show'); }
    else e.classList.remove('show');
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearError(errId) { setError(errId, ''); }

  var rules = {
    'inp-name': function (v) { return v.trim().length < 2 ? 'Please enter your full name.' : ''; },
    'inp-phone': function (v) {
      var n = v.replace(/[\s\-()]/g, '');
      return /^(09\d{9}|\+639\d{9})$/.test(n) ? '' : 'Enter a valid mobile number, e.g. 09123456789.';
    },
    'inp-email': function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    'inp-date': function (v) {
      if (!v) return 'Please choose your visit date.';
      return v < localToday() ? 'Please choose today or a future date.' : '';
    }
  };
  function validateField(id) {
    var input = $(id), msg = rules[id](input.value);
    setError('err-' + id.replace('inp-', ''), msg, input);
    return !msg;
  }
  function validateStep(n) {
    if (n === 1) {
      var firstBad = null;
      Object.keys(rules).forEach(function (id) { if (!validateField(id) && !firstBad) firstBad = $(id); });
      if (firstBad) { firstBad.focus(); return false; }
    } else if (n === 2 && !state.ticket) {
      setError('err-ticket', 'Please choose a ticket type.'); document.querySelector('input[name="ticket"]').focus(); return false;
    } else if (n === 3 && !state.cottage) {
      setError('err-cottage', 'Please choose a cottage.'); document.querySelector('input[name="cottage"]').focus(); return false;
    } else if (n === 4 && !$('inp-confirm').checked) {
      setError('err-confirm', 'Please tick the box to confirm.'); $('inp-confirm').focus(); return false;
    }
    return true;
  }

  /* ---- Navigation ---- */
  function go(n, quiet) {
    state.step = n;
    steps.forEach(function (s, i) { s.classList.toggle('active', i + 1 === n); });
    stepperItems.forEach(function (li, i) {
      li.classList.toggle('done', i + 1 < n);
      li.classList.toggle('current', i + 1 === n);
      if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('btn-back').hidden = n === 1;
    $('btn-next').textContent = n === 4 ? 'Confirm booking' : 'Next step';
    if (n === 4) renderReview();
    if (quiet) return;
    var h = steps[n - 1].querySelector('legend');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    $('panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderReview() {
    var c = cottage(), r = RATES[state.ticket], cp = cottagePrice();
    $('rev-name').textContent = $('inp-name').value.trim();
    $('rev-contact').textContent = $('inp-phone').value.trim() + '  \u2022  ' + $('inp-email').value.trim();
    $('rev-list').innerHTML =
      '<dt>Visit date</dt><dd>' + fmtDate($('inp-date').value) + '</dd>' +
      '<dt>Ticket</dt><dd>' + (state.ticket === 'Day' ? 'Day Pass \u00B7 8:00 AM \u2013 5:00 PM' : 'Overnight \u00B7 2:00 PM \u2013 12:00 NN next day') + '</dd>' +
      '<dt>Guests</dt><dd>' + state.adults + ' adult(s), ' + state.children + ' child(ren)</dd>' +
      '<dt>Cottage</dt><dd>' + c.name + '</dd>';
    $('bd-list').innerHTML =
      '<div><span>Adults (' + state.adults + ' \u00D7 ' + peso(r.adult) + ')</span><span>' + peso(state.adults * r.adult) + '</span></div>' +
      '<div><span>Children (' + state.children + ' \u00D7 ' + peso(r.child) + ')</span><span>' + peso(state.children * r.child) + '</span></div>' +
      '<div><span>' + c.name + ' (' + (state.ticket === 'Day' ? 'day' : 'night') + ')</span><span>' + peso(cp) + '</span></div>' +
      '<div class="grand"><span>Total</span><span>' + peso(total()) + '</span></div>';
  }

  $('btn-back').addEventListener('click', function () { go(state.step - 1); });
  $('booking-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(state.step)) return;
    if (state.step < 4) go(state.step + 1); else submit();
  });
  $('inp-confirm').addEventListener('change', function () { clearError('err-confirm'); });

  /* ---- Submit ---- */
  function makeRef() {
    var d = new Date(), chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'GN-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + s;
  }
  function detailsText(ref) {
    var c = cottage();
    return ['Golden Nature Cold Spring Resort \u2014 booking request', 'Ref: ' + ref,
      'Name: ' + $('inp-name').value.trim(), 'Phone: ' + $('inp-phone').value.trim(), 'Email: ' + $('inp-email').value.trim(),
      'Date: ' + fmtDate($('inp-date').value), 'Ticket: ' + state.ticket,
      'Guests: ' + state.adults + ' adult(s), ' + state.children + ' child(ren)', 'Cottage: ' + c.name,
      'Estimated total: ' + peso(total())].join('\n');
  }
  function submit() {
    var btn = $('btn-next'), ref = makeRef(), text = detailsText(ref);
    btn.disabled = true; btn.textContent = 'Sending\u2026';
    var payload = {
      ref: ref, name: $('inp-name').value.trim(), phone: $('inp-phone').value.trim(), email: $('inp-email').value.trim(),
      date: $('inp-date').value, ticket: state.ticket, adults: state.adults, children: state.children,
      cottage: state.cottage, total: total()
    };
    var send = BOOKING_ENDPOINT
      ? fetch(BOOKING_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) throw new Error('bad status'); })
      : new Promise(function (res) { setTimeout(res, 700); });
    send.then(function () {
      $('done-ref').textContent = ref;
      $('done-total').textContent = peso(total());
      $('done-copy').onclick = function () { copy(text); };
      $('done-fb').href = FACEBOOK_URL;
      document.querySelector('.stepper').hidden = true;
      $('booking-form').hidden = true;
      $('done').classList.add('active');
      $('panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('done').querySelector('h2').focus();
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'Confirm booking';
      toast('Could not send. Please try again or call ' + PHONE + '.');
    });
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Booking details copied'); }, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Booking details copied'); } catch (e) { toast('Copy failed \u2014 please screenshot this page'); }
      ta.remove();
    }
  }

  go(1, true);
  updateSummary();
})();

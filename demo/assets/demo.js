/** @type {HTMLButtonElement} */ const acceptAllBtn = document.getElementById('accept-all-btn');
/** @type {HTMLButtonElement} */ const rejectAllBtn = document.getElementById('reject-all-btn');
/** @type {HTMLButtonElement} */ const resetBtn     = document.getElementById('reset-btn');
/** @type {HTMLButtonElement} */ const runBtn       = document.getElementById('run-btn');

acceptAllBtn.addEventListener('click', () => im.acceptService('all'));
rejectAllBtn.addEventListener('click', () => im.rejectService('all'));

resetBtn.addEventListener('click', () => {
    runBtn.disabled = false;
    resetBtn.disabled = true;
    acceptAllBtn.disabled = true;
    rejectAllBtn.disabled = true;
    im.reset(true);
})

runBtn.addEventListener('click', () => {
    runBtn.disabled = true;
    resetBtn.disabled = false;
    acceptAllBtn.disabled = false;
    rejectAllBtn.disabled = false;
    im.run(config);
})
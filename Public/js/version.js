let _cachedCommitDate = null;
let _cachedCommitMsg = null;
let _commitFetchError = false;

const _warnIcon = `<svg class="inline-block w-4 h-4 text-[#FFD60A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;

function refreshCommitDisplay() {
    if (!_cachedCommitDate && !_commitFetchError) return;
    const msgElement = document.getElementById('latest-commit-msg');
    const timeElement = document.getElementById('latest-commit-time');
    if (!msgElement || !timeElement) return;

    msgElement.removeAttribute('data-i18n');

    if (_commitFetchError) {
        msgElement.innerText = t('system.unavailable');
        timeElement.innerHTML = _warnIcon;
        return;
    }

    const now = new Date();
    const diffMs = now - _cachedCommitDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeString;
    if (diffDays > 0) {
        timeString = diffDays > 1 ? t('system.daysAgoPlural', { n: diffDays }) : t('system.daysAgo', { n: diffDays });
    } else if (diffHours > 0) {
        timeString = t('system.hoursAgo', { n: diffHours });
    } else if (diffMins > 0) {
        timeString = t('system.minutesAgo', { n: diffMins });
    } else {
        timeString = t('system.justNow');
    }

    msgElement.innerText = _cachedCommitMsg;
    timeElement.innerText = timeString;
}
window.refreshCommitDisplay = refreshCommitDisplay;

async function loadLatestGitHubCommit() {
    const repoOwner = 'HazeCCS';
    const repoName = 'Snusdex';

    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`);
        if (!response.ok) throw new Error('Repo ist privat oder API Rate Limit erreicht');

        const data = await response.json();
        if (data && data.length > 0) {
            const fullMessage = data[0].commit.message;
            let shortMsg = fullMessage.split('\n')[0];
            if (shortMsg.length > 50) shortMsg = shortMsg.substring(0, 50) + '...';

            _cachedCommitDate = new Date(data[0].commit.committer.date);
            _cachedCommitMsg = shortMsg;
            _commitFetchError = false;
            refreshCommitDisplay();
        }
    } catch (error) {
        console.warn('GitHub Commit Log:', error.message);
        _commitFetchError = true;
        refreshCommitDisplay();
    }
}

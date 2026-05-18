// ==========================================
// GITHUB COMMIT FETCH (App-Version + Time)
// ==========================================
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
            if (shortMsg.length > 50) { // Du kannst das Limit hier auch erhöhen, da es jetzt umbricht!
                shortMsg = shortMsg.substring(0, 50) + '...';
            }

            const commitDate = new Date(data[0].commit.committer.date);
            const now = new Date();
            const diffMs = now - commitDate;

            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let timeString = "";
            if (diffDays > 0) {
                timeString = diffDays > 1 ? t('system.daysAgoPlural', { n: diffDays }) : t('system.daysAgo', { n: diffDays });
            } else if (diffHours > 0) {
                timeString = t('system.hoursAgo', { n: diffHours });
            } else if (diffMins > 0) {
                timeString = t('system.minutesAgo', { n: diffMins });
            } else {
                timeString = t('system.justNow');
            }

            // --- HIER IST DIE WICHTIGE ÄNDERUNG ---
            const msgElement = document.getElementById('latest-commit-msg');
            const timeElement = document.getElementById('latest-commit-time');

            if (msgElement) {
                msgElement.innerText = shortMsg; // Setzt nur den reinen Text
            }
            if (timeElement) {
                timeElement.innerText = timeString; // Setzt die Zeit in das graue Feld darunter
            }
        }
    } catch (error) {
        console.warn('GitHub Commit Log:', error.message);
        const msgElement = document.getElementById('latest-commit-msg');
        const timeElement = document.getElementById('latest-commit-time');

        if (msgElement) {
            msgElement.innerText = t('system.unavailable');
        }
        if (timeElement) {
            timeElement.innerText = '';
        }
    }
}

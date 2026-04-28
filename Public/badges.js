async function loadBadges() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch user collections count for collector badges
    const { data: collections } = await supabaseClient
        .from('user_collections')
        .select('snus_id')
        .eq('user_id', user.id);
    
    const uniqueCansCount = collections ? new Set(collections.map(c => c.snus_id)).size : 0;

    // Fetch all badges
    const { data: allBadges } = await supabaseClient
        .from('badges')
        .select('*')
        .order('level', { ascending: true });

    // Fetch user unlocked badges
    const { data: userBadges } = await supabaseClient
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

    const unlockedBadgeIds = new Set(userBadges ? userBadges.map(ub => ub.badge_id) : []);

    const stripContainer = document.getElementById('badges-strip');
    if (stripContainer && allBadges) {
        let stripHtml = '';
        allBadges.forEach(badge => {
            const isUnlocked = unlockedBadgeIds.has(badge.id);
            const imgUrl = GITHUB_BASE + badge.image_url;
            if (isUnlocked) {
                stripHtml += `<div class="w-12 h-12 flex-shrink-0 rounded-full border border-white/20 bg-[#2C2C2E] overflow-hidden"><img src="${imgUrl}" class="w-full h-full object-cover"></div>`;
            }
        });
        if (stripHtml === '') {
            stripContainer.innerHTML = '<div class="text-[13px] text-[#8E8E93] py-2">Noch keine Badges freigeschaltet.</div>';
        } else {
            stripContainer.innerHTML = stripHtml;
        }
    }
}

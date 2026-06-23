{**
 * templates/frontend/pages/indexJournal.tpl
 *
 * GBMN Theme — Journal homepage
 *}
{include file="frontend/components/header.tpl" pageTitleTranslated=$currentContext->getLocalizedName()}

{* ── HERO ── *}
<section id="gbmn-hero">
	<div class="gbmn-hero-watermark" aria-hidden="true">GBMN</div>
	<div class="gbmn-hero-content">
		{if $gbmnFormerName}
			<span class="gbmn-hero-badge">FORMERLY {$gbmnFormerName|escape}</span>
		{/if}
		<h1 class="gbmn-hero-title">
			{if $gbmnHeroHeadline}
				{$gbmnHeroHeadline|escape}
			{else}
				{$currentContext->getLocalizedName()|escape}
			{/if}
		</h1>
		{if $gbmnHeroSubtitle || $currentContext->getLocalizedDescription()}
			<p class="gbmn-hero-sub">
				{if $gbmnHeroSubtitle}
					{$gbmnHeroSubtitle|escape}
				{else}
					{$currentContext->getLocalizedDescription()|strip_tags|truncate:200:"…"}
				{/if}
			</p>
		{/if}
		<div class="gbmn-hero-buttons">
			<a href="{url page="about" op="submissions"}" class="gbmn-btn-primary">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
				{translate key="common.publishedArticles"} {* Submit Manuscript *}
				{translate key="plugins.themes.gbmn.submitManuscript" default="Submit Manuscript"} →
			</a>
			{if $currentIssue}
				<a href="{url page="issue" op="view" path=$currentIssue->getBestIssueId()}" class="gbmn-btn-secondary">
					{translate key="plugins.themes.gbmn.viewCurrentIssue" default="View Current Issue"}
				</a>
			{/if}
		</div>
	</div>
</section>

{* ── FEATURES ── *}
<section id="gbmn-features">
	<div class="gbmn-features-grid">
		<div class="gbmn-feature-item">
			<div class="gbmn-feature-icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
			</div>
			<div class="gbmn-feature-title">{translate key="plugins.themes.gbmn.peerReviewed" default="Peer Reviewed"}</div>
			<div class="gbmn-feature-desc">{translate key="plugins.themes.gbmn.peerReviewedDesc" default="Rigorous scientific evaluation"}</div>
		</div>
		<div class="gbmn-feature-item">
			<div class="gbmn-feature-icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
			</div>
			<div class="gbmn-feature-title">{translate key="plugins.themes.gbmn.openAccess" default="Open Access"}</div>
			<div class="gbmn-feature-desc">{translate key="plugins.themes.gbmn.openAccessDesc" default="Gold OA Publishing Model"}</div>
		</div>
		<div class="gbmn-feature-item">
			<div class="gbmn-feature-icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M2 12c0 4.42 4.48 8 10 8s10-3.58 10-8"/><path d="M2 12c0-4.42 4.48-8 10-8s10 3.58 10 8"/></svg>
			</div>
			<div class="gbmn-feature-title">{translate key="plugins.themes.gbmn.rapidIndexing" default="Rapid Indexing"}</div>
			<div class="gbmn-feature-desc">{translate key="plugins.themes.gbmn.rapidIndexingDesc" default="Crossref, Google Scholar"}</div>
		</div>
		<div class="gbmn-feature-item">
			<div class="gbmn-feature-icon">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
			</div>
			<div class="gbmn-feature-title">{translate key="plugins.themes.gbmn.legacyTitle" default="Legacy Title"}</div>
			<div class="gbmn-feature-desc">{translate key="plugins.themes.gbmn.legacyTitleDesc" default="Est. 2020 as GBN"}</div>
		</div>
	</div>
</section>

{* ── MAIN CONTENT + SIDEBAR ── *}
<div id="gbmn-main">
	<main>
		{* Latest Articles *}
		{if $publishedSubmissions}
			<div class="gbmn-section-header">
				<h2 class="gbmn-section-title">{translate key="plugins.themes.gbmn.latestArticles" default="Latest Research Articles"}</h2>
				<a href="{url page="issue" op="archive"}" class="gbmn-browse-all">
					{translate key="common.browseAll" default="Browse All"} →
				</a>
			</div>
			{foreach from=$publishedSubmissions item=article}
				{include file="frontend/objects/article_summary.tpl" article=$article}
			{/foreach}
		{/if}

		{* Announcements *}
		{if $announcements}
			<div class="gbmn-section-header" style="margin-top:2.5rem">
				<h2 class="gbmn-section-title">{translate key="announcement.announcements"}</h2>
			</div>
			{foreach from=$announcements item=announcement}
				<div style="padding:.75rem 0; border-bottom:1px solid var(--gbmn-border);">
					<div class="gbmn-announcement-date">{$announcement->getDatePosted()|date_format:"%B %Y"}</div>
					<a href="{url page="announcement" op="view" path=$announcement->getId()}" class="gbmn-article-title" style="font-size:.9375rem;">
						{$announcement->getLocalizedTitle()|escape}
					</a>
				</div>
			{/foreach}
		{/if}
	</main>

	{* Sidebar *}
	<aside class="gbmn-sidebar">
		{* Current Issue *}
		{if $currentIssue}
			<div class="gbmn-current-issue">
				<div class="gbmn-ci-header">
					<div class="gbmn-ci-label">{translate key="plugins.themes.gbmn.currentIssue" default="Current Issue"}</div>
				</div>
				<div class="gbmn-ci-body">
					{if $currentIssue->getData('coverImage')}
						<div class="gbmn-ci-cover">
							<img src="{$currentIssue->getData('coverImage')|escape}" alt="">
						</div>
					{/if}
					<div class="gbmn-ci-info">
						<div class="gbmn-ci-vol">
							{$currentIssue->getIssueSeries()|escape}
						</div>
						{if $currentIssue->getShowTitle()}
							<span class="gbmn-ci-badge">{translate key="plugins.themes.gbmn.newPrintIssue" default="New Print Issue"}</span>
						{/if}
						<div class="gbmn-ci-year">{translate key="issue.published"} {$currentIssue->getYear()|escape}</div>
						<a href="{url page="issue" op="view" path=$currentIssue->getBestIssueId()}" class="gbmn-ci-toc-btn">
							{translate key="issue.tableOfContents"}
						</a>
					</div>
				</div>
			</div>
		{/if}

		{* Aims & Scope *}
		{if $currentContext->getLocalizedData('authorGuidelines')}
			<div class="gbmn-sidebar-block">
				<div class="gbmn-sidebar-block-title">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					{translate key="about.aboutContext"}
				</div>
				<div class="gbmn-sidebar-block-body">
					<p>{$currentContext->getLocalizedDescription()|strip_tags|truncate:200:"…"}</p>
					<a href="{url page="about"}" class="read-more">{translate key="about.fullStatement"} →</a>
				</div>
			</div>
		{/if}

		{* Announcements in sidebar *}
		{if $announcements}
			<div class="gbmn-sidebar-block">
				<div class="gbmn-sidebar-block-title">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
					{translate key="announcement.announcements"}
				</div>
				<div class="gbmn-sidebar-block-body" style="padding:0">
					<ul class="gbmn-announcement-list" style="padding:.75rem 1.125rem">
						{foreach from=$announcements item=announcement name=ann}
							{if $smarty.foreach.ann.index < 3}
								<li>
									<div class="gbmn-announcement-date">{$announcement->getDatePosted()|date_format:"%B %Y"}</div>
									<a href="{url page="announcement" op="view" path=$announcement->getId()}" class="gbmn-announcement-title">
										{$announcement->getLocalizedTitle()|escape}
									</a>
								</li>
							{/if}
						{/foreach}
					</ul>
				</div>
			</div>
		{/if}
	</aside>
</div>

{include file="frontend/components/footer.tpl"}

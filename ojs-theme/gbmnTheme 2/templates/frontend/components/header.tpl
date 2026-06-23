{**
 * templates/frontend/components/header.tpl
 *
 * GBMN Theme — Site header rendered on every page
 *}
<!DOCTYPE html>
<html lang="{$currentLocale|replace:'_':'-'}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>{$pageTitleTranslated|default:$currentContext->getLocalizedName()|escape}{if $siteTitle} — {$siteTitle|escape}{/if}</title>

	{* Favicons *}
	{if $currentContext->getData('favicon')}
		<link rel="icon" href="{$baseUrl}/{$currentContext->getData('favicon')|escape}">
	{/if}

	{* Meta *}
	{if $currentContext->getLocalizedDescription()}
		<meta name="description" content="{$currentContext->getLocalizedDescription()|strip_tags|truncate:160|escape}">
	{/if}

	{* Theme CSS (injected by plugin) *}
	{load_stylesheet context="frontend"}

	{* Google Fonts — Inter *}
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="pkp_page_{$requestedPage|default:"index"} pkp_op_{$requestedOp|default:"index"}">

{* ══════════════════════════════════════════
   TOP BAR
   ══════════════════════════════════════════ *}
<div id="gbmn-topbar" role="banner">
	<div class="gbmn-topbar-inner">
		<div class="gbmn-topbar-left">
			{if $gbmnIssnPrint}
				<span>ISSN: {$gbmnIssnPrint|escape}</span>
			{/if}
			{if $gbmnIssnPrint && $gbmnFormerName}<span>|</span>{/if}
			{if $gbmnFormerName}
				<span>Formerly {$gbmnFormerName|escape}</span>
			{/if}
		</div>
		<div class="gbmn-topbar-right">
			<a href="{url page="about" op="submissions"}">{translate key="plugins.themes.gbmn.submitManuscript" default="Submit Manuscript"}</a>
			<a href="{url page="about"}">{translate key="about.aboutContext" default="Indexing"}</a>
		</div>
	</div>
</div>

{* ══════════════════════════════════════════
   HEADER
   ══════════════════════════════════════════ *}
<header id="gbmn-header">
	<div class="gbmn-header-inner">
		{* Logo + journal name *}
		<a href="{url page="index"}" class="gbmn-logo-wrap" aria-label="{$currentContext->getLocalizedName()|escape}">
			{if $currentContext->getData('pageHeaderLogoImage')}
				<div class="gbmn-logo-box">
					<img src="{$baseUrl}/{$currentContext->getData('pageHeaderLogoImage')|escape}" alt="{$currentContext->getLocalizedName()|escape}">
				</div>
			{else}
				<div class="gbmn-logo-box">
					<span class="gbmn-logo-box-text">GBMN</span>
				</div>
			{/if}
			<div class="gbmn-journal-name">
				<strong>{$currentContext->getLocalizedName()|escape}</strong>
				<small>{translate key="plugins.themes.gbmn.tagline" default="Advancing Scholarly Communication in Georgia"}</small>
			</div>
		</a>

		{* Actions *}
		<div class="gbmn-header-actions">
			<button class="gbmn-search-btn" id="gbmn-search-open" aria-label="{translate key="common.search"}">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			</button>
			<a href="{url page="about" op="submissions"}" class="gbmn-submit-btn">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
				{translate key="plugins.themes.gbmn.submitNow" default="Submit Now"}
			</a>
		</div>
	</div>
</header>

{* ══════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════ *}
<nav id="gbmn-nav" aria-label="{translate key="common.navigation.site"}">
	<div class="gbmn-nav-inner">
		<ul>
			<li{if $requestedPage == "index"} class="current"{/if}>
				<a href="{url page="index"}">{translate key="navigation.home"}</a>
			</li>
			<li{if $requestedPage == "about"} class="current"{/if}>
				<a href="{url page="about"}">{translate key="about.aboutContext"}</a>
				<ul>
					<li><a href="{url page="about"}">{translate key="about.aboutContext"}</a></li>
					<li><a href="{url page="about" op="editorialTeam"}">{translate key="about.editorialTeam"}</a></li>
					<li><a href="{url page="about" op="contact"}">{translate key="about.contact"}</a></li>
					<li><a href="{url page="about" op="submissions"}">{translate key="about.submissions"}</a></li>
				</ul>
			</li>
			<li{if $requestedPage == "issue"} class="current"{/if}>
				<a href="{url page="issue" op="archive"}">{translate key="navigation.archives"}</a>
			</li>
			<li{if $requestedPage == "search"} class="current"{/if}>
				<a href="{url page="search"}">{translate key="common.search"}</a>
			</li>
			{* User nav *}
			{if $isUserLoggedIn}
				<li>
					<a href="{url page="user" op="profile"}">{$loggedInUsername|escape}</a>
					<ul>
						<li><a href="{url page="user" op="profile"}">{translate key="user.profile"}</a></li>
						<li><a href="{url page="login" op="signOut"}">{translate key="user.logOut"}</a></li>
					</ul>
				</li>
			{else}
				<li{if $requestedPage == "login"} class="current"{/if}>
					<a href="{url page="login"}">{translate key="user.login"}</a>
				</li>
				<li{if $requestedPage == "user" && $requestedOp == "register"} class="current"{/if}>
					<a href="{url page="user" op="register"}">{translate key="user.register"}</a>
				</li>
			{/if}
		</ul>
	</div>
</nav>

{* ══════════════════════════════════════════
   SEARCH OVERLAY
   ══════════════════════════════════════════ *}
<div id="gbmn-search-overlay"
	 hidden
	 style="position:fixed;inset:0;z-index:500;background:rgba(15,23,42,.7);display:flex;align-items:flex-start;justify-content:center;padding-top:15vh;">
	<div style="background:#fff;border-radius:8px;padding:2rem;width:min(560px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.3);">
		<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
			<strong style="font-size:1.0625rem;color:#0f172a;">{translate key="common.search"}</strong>
			<button id="gbmn-search-close"
					style="background:none;border:none;cursor:pointer;padding:.35rem;color:#64748b;font-size:1.25rem;line-height:1;"
					aria-label="{translate key="common.close"}">✕</button>
		</div>
		<form action="{url page="search"}" method="get" role="search">
			<div class="gbmn-search-form">
				<input type="search" name="query" class="gbmn-search-input"
					   placeholder="{translate key="common.searchQuery"}...">
				<button type="submit" class="gbmn-search-submit">
					{translate key="common.search"}
				</button>
			</div>
		</form>
	</div>
</div>

{* Notification messages *}
{if $notificationManager}
	{call_hook name="NotificationManager::notifyUser"}
{/if}

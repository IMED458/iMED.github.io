{**
 * templates/frontend/components/footer.tpl
 *
 * GBMN Theme — Site footer
 *}
<footer id="gbmn-footer" role="contentinfo">
	<div class="gbmn-footer-inner">
		{* Brand column *}
		<div class="gbmn-footer-brand">
			<a href="{url page="index"}" class="gbmn-logo-wrap" aria-label="{$currentContext->getLocalizedName()|escape}">
				{if $currentContext->getData('pageHeaderLogoImage')}
					<div class="gbmn-logo-box">
						<img src="{$baseUrl}/{$currentContext->getData('pageHeaderLogoImage')|escape}" alt="">
					</div>
				{else}
					<div class="gbmn-logo-box"><span class="gbmn-logo-box-text">GBMN</span></div>
				{/if}
				<div class="gbmn-journal-name">
					<strong>{$currentContext->getLocalizedName()|escape}</strong>
					<small>{translate key="plugins.themes.gbmn.tagline" default="Advancing Scholarly Communication in Georgia"}</small>
				</div>
			</a>
			{if $currentContext->getLocalizedData('publisherInstitution')}
				<p class="gbmn-footer-desc" style="margin-top:.75rem">
					{$currentContext->getLocalizedData('publisherInstitution')|escape}
				</p>
			{/if}
			<div class="gbmn-footer-issn">
				{if $gbmnIssnPrint}<div>ISSN (Print): <span>{$gbmnIssnPrint|escape}</span></div>{/if}
				{if $currentContext->getData('onlineIssn')}<div>ISSN (Online): <span>{$currentContext->getData('onlineIssn')|escape}</span></div>{/if}
			</div>
		</div>

		{* Primary nav *}
		<nav class="gbmn-footer-nav" aria-label="{translate key="common.navigation.site"}">
			<div class="gbmn-footer-nav-title">{translate key="common.navigation.site"}</div>
			<ul>
				<li><a href="{url page="index"}">{translate key="navigation.home"}</a></li>
				<li><a href="{url page="about"}">{translate key="about.aboutContext"}</a></li>
				<li><a href="{url page="about" op="editorialTeam"}">{translate key="about.editorialTeam"}</a></li>
				<li><a href="{url page="issue" op="archive"}">{translate key="navigation.archives"}</a></li>
				<li><a href="{url page="about" op="submissions"}">{translate key="about.submissions"}</a></li>
				<li><a href="{url page="about" op="contact"}">{translate key="about.contact"}</a></li>
			</ul>
		</nav>

		{* For authors *}
		<nav class="gbmn-footer-nav" aria-label="{translate key="about.submissions"}">
			<div class="gbmn-footer-nav-title">{translate key="about.forAuthors" default="For Authors"}</div>
			<ul>
				<li><a href="{url page="about" op="submissions"}">{translate key="author.submit"}</a></li>
				<li><a href="{url page="about" op="submissions"}">{translate key="author.authorGuidelines"}</a></li>
				<li><a href="{url page="about" op="privacy"}">{translate key="about.privacyStatement"}</a></li>
			</ul>
		</nav>
	</div>

	<div class="gbmn-footer-bottom">
		<div>
			© {$smarty.now|date_format:"%Y"} {$currentContext->getLocalizedName()|escape}.
			{translate key="plugins.themes.gbmn.allRightsReserved" default="All rights reserved."}
		</div>
		<div>
			{translate key="plugins.themes.gbmn.poweredBy" default="Powered by"}
			<a href="https://pkp.sfu.ca/ojs/" target="_blank" rel="noopener">Open Journal Systems</a>
		</div>
	</div>
</footer>

{load_script context="frontend"}
</body>
</html>

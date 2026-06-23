{**
 * templates/frontend/pages/article.tpl
 *
 * GBMN Theme — Article landing page
 *}
{assign var=publication value=$article->getCurrentPublication()}
{include file="frontend/components/header.tpl" pageTitleTranslated=$publication->getLocalizedTitle()}

<div class="gbmn-article-page">
	<main>
		{* Article type *}
		{if $section}
			<div class="gbmn-article-page-type">{$section->getLocalizedTitle()|escape}</div>
		{/if}

		{* Title *}
		<h1 class="gbmn-article-page-title">{$publication->getLocalizedFullTitle()|escape}</h1>

		{* Authors *}
		{assign var=authors value=$publication->getData('authors')}
		{if $authors}
			<div class="gbmn-article-page-authors">
				{foreach from=$authors item=author name=al}
					{$author->getFullName()|escape}{if !$smarty.foreach.al.last}, {/if}
				{/foreach}
			</div>
			{foreach from=$authors item=author}
				{if $author->getLocalizedAffiliation()}
					<div class="gbmn-article-page-affil">{$author->getLocalizedAffiliation()|escape}</div>
				{/if}
			{/foreach}
		{/if}

		{* Galleys *}
		{assign var=galleys value=$publication->getData('galleys')}
		{if $galleys}
			<div class="gbmn-article-page-galleys">
				{foreach from=$galleys item=galley}
					<a href="{url page="article" op="view" path=$article->getBestId()|cat:"/"|cat:$galley->getBestGalleyId()}"
					   class="gbmn-galley-btn {if $galley@first}primary{else}secondary{/if}"
					   aria-label="{$galley->getLabel()|escape} — {$publication->getLocalizedTitle()|escape}">
						{if $galley->getFileType() == "application/pdf"}
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
						{/if}
						{$galley->getLabel()|escape}
					</a>
				{/foreach}
			</div>
		{/if}

		{* Abstract *}
		{if $publication->getLocalizedData('abstract')}
			<section aria-labelledby="gbmn-abstract-heading">
				<h2 class="gbmn-abstract-title" id="gbmn-abstract-heading">{translate key="submission.abstract"}</h2>
				<div class="gbmn-abstract-text">{$publication->getLocalizedData('abstract')|strip_unsafe_html}</div>
			</section>
		{/if}

		{* Keywords *}
		{if $publication->getLocalizedData('keywords')}
			<div class="gbmn-keywords">
				<div class="gbmn-keywords-title">{translate key="article.subject"}</div>
				{foreach from=$publication->getLocalizedData('keywords') item=kw}
					<span class="gbmn-keyword-tag">{$kw|escape}</span>
				{/foreach}
			</div>
		{/if}

		{* References *}
		{if $publication->getData('citationsRaw')}
			<section style="margin-top:2rem;padding-top:2rem;border-top:1px solid var(--gbmn-border);">
				<h2 style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0f172a;margin-bottom:1rem;">
					{translate key="submission.citations"}
				</h2>
				<div style="font-size:.875rem;color:var(--gbmn-muted);line-height:1.9;white-space:pre-wrap;">
					{$publication->getData('citationsRaw')|escape}
				</div>
			</section>
		{/if}
	</main>

	{* Sidebar *}
	<aside class="gbmn-sidebar">
		<div class="gbmn-article-info-block">
			<dl>
				{if $publication->getDoi()}
					<dt>DOI</dt>
					<dd><a href="https://doi.org/{$publication->getDoi()|escape}">{$publication->getDoi()|escape}</a></dd>
				{/if}
				{if $issue}
					<dt>{translate key="issue.issue"}</dt>
					<dd><a href="{url page="issue" op="view" path=$issue->getBestIssueId()}">{$issue->getIssueSeries()|escape}</a></dd>
				{/if}
				{if $publication->getData('datePublished')}
					<dt>{translate key="submission.publishDate"}</dt>
					<dd>{$publication->getData('datePublished')|date_format:"%B %d, %Y"}</dd>
				{/if}
				{if $publication->getData('dateSubmitted')}
					<dt>{translate key="submission.submit.title"}</dt>
					<dd>{$publication->getData('dateSubmitted')|date_format:"%B %d, %Y"}</dd>
				{/if}
				{if $section}
					<dt>{translate key="section.section"}</dt>
					<dd>{$section->getLocalizedTitle()|escape}</dd>
				{/if}
			</dl>
		</div>

		{* License *}
		{if $publication->getData('licenseUrl')}
			<div class="gbmn-sidebar-block">
				<div class="gbmn-sidebar-block-title">{translate key="submission.license"}</div>
				<div class="gbmn-sidebar-block-body" style="text-align:center;">
					<a href="{$publication->getData('licenseUrl')|escape}" target="_blank" rel="noopener" style="font-size:.8125rem;color:var(--gbmn-accent);">
						{translate key="submission.license"}
					</a>
				</div>
			</div>
		{/if}
	</aside>
</div>

{include file="frontend/components/footer.tpl"}

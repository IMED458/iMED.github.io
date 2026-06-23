{**
 * templates/frontend/objects/article_summary.tpl
 *
 * GBMN Theme — Single article card used on homepage, TOC, search
 *
 * @param $article  PublishedSubmission
 *}
{assign var=articlePath value=$article->getBestId()}
{assign var=publication value=$article->getCurrentPublication()}

<article class="gbmn-article-card">

	{* Thumbnail *}
	{if $publication->getData('coverImage')}
		{assign var=coverImages value=$publication->getData('coverImage')}
		{if $coverImages[$currentLocale]}
			<img class="gbmn-article-thumb"
				 src="{$publicFilesDir}/{$coverImages[$currentLocale].uploadName|escape}"
				 alt="{$coverImages[$currentLocale].altText|default:''|escape}">
		{else}
			<div class="gbmn-article-thumb-placeholder"></div>
		{/if}
	{else}
		<div class="gbmn-article-thumb-placeholder"></div>
	{/if}

	<div>
		{* Article type + DOI *}
		<div class="gbmn-article-meta">
			{if $publication->getData('sectionTitle')}
				<span class="gbmn-article-type">{$publication->getData('sectionTitle')|escape}</span>
			{/if}
			{if $publication->getDoi()}
				<span class="gbmn-article-doi">DOI: {$publication->getDoi()|escape}</span>
			{/if}
		</div>

		{* Title *}
		<a href="{url page="article" op="view" path=$articlePath}" class="gbmn-article-title">
			{$publication->getLocalizedTitle()|escape}
		</a>

		{* Authors *}
		{assign var=authors value=$publication->getData('authors')}
		{if $authors}
			<div class="gbmn-article-authors">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				{foreach from=$authors item=author name=authorLoop}
					{$author->getLastName()|escape|upper}{if $author->getFirstName()}, {$author->getFirstName()|truncate:1:"."}{/if}{if !$smarty.foreach.authorLoop.last}; {/if}
				{/foreach}
			</div>
		{/if}

		{* Published in *}
		{if $issue}
			<div class="gbmn-article-pub">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
				{translate key="submission.publishedIn"}: {$issue->getIssueSeries()|escape} ({$issue->getYear()|escape})
			</div>
		{/if}

		{* Links & received date *}
		<div class="gbmn-article-footer">
			<div class="gbmn-article-links">
				<a href="{url page="article" op="view" path=$articlePath}" class="gbmn-link-fulltext">
					{translate key="submission.fullText"} ›
				</a>
				{foreach from=$publication->getData('galleys') item=galley}
					{if $galley->getFileType() == "application/pdf" || $galley->getLabel() == "PDF"}
						<a href="{url page="article" op="view" path=$articlePath|cat:"/"|cat:$galley->getBestGalleyId()}"
						   class="gbmn-link-pdf"
						   aria-label="{translate key="submission.representationOfSubmission" label=$galley->getLabel()|escape title=$publication->getLocalizedTitle()|escape}">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
							{$galley->getLabel()|escape}
						</a>
					{/if}
				{/foreach}
			</div>
			{if $publication->getData('dateSubmitted')}
				<span class="gbmn-article-received">
					{translate key="submission.receivedDate"}: {$publication->getData('dateSubmitted')|date_format:"%B %d, %Y"}
				</span>
			{/if}
		</div>
	</div>
</article>

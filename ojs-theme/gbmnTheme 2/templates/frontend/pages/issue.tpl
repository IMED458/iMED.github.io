{**
 * templates/frontend/pages/issue.tpl
 *
 * GBMN Theme — Issue table of contents
 *}
{include file="frontend/components/header.tpl" pageTitleTranslated=$issue->getIssueSeries()}

<div id="gbmn-main">
	<main>

		{* Issue header *}
		<div class="gbmn-toc-header">
			{if $issue->getData('coverImage')}
				{assign var=coverImages value=$issue->getData('coverImage')}
				{if $coverImages[$currentLocale]}
					<div class="gbmn-toc-cover">
						<img src="{$publicFilesDir}/{$coverImages[$currentLocale].uploadName|escape}" alt="">
					</div>
				{/if}
			{/if}
			<div>
				<div class="gbmn-toc-vol">{$issue->getIssueSeries()|escape}</div>
				{if $issue->getYear()}<div class="gbmn-toc-year">{$issue->getYear()|escape}</div>{/if}
				{if $issue->getLocalizedDescription()}
					<div class="gbmn-toc-desc">{$issue->getLocalizedDescription()|strip_tags|truncate:300:"…"}</div>
				{/if}
			</div>
		</div>

		{* Sections & articles *}
		{foreach from=$issueSubmissions item=section key=sectionId}
			{if $section.articles}
				{if $section.title}
					<div class="gbmn-toc-section-title">{$section.title|escape}</div>
				{/if}
				{foreach from=$section.articles item=article}
					{include file="frontend/objects/article_summary.tpl" article=$article issue=$issue}
				{/foreach}
			{/if}
		{/foreach}

	</main>

	<aside class="gbmn-sidebar">
		{if $currentIssue}
			<div class="gbmn-current-issue">
				<div class="gbmn-ci-header">
					<div class="gbmn-ci-label">{translate key="plugins.themes.gbmn.currentIssue" default="Current Issue"}</div>
				</div>
				<div class="gbmn-ci-body">
					<div class="gbmn-ci-info">
						<div class="gbmn-ci-vol">{$currentIssue->getIssueSeries()|escape}</div>
						<div class="gbmn-ci-year">{translate key="issue.published"} {$currentIssue->getYear()|escape}</div>
						<a href="{url page="issue" op="view" path=$currentIssue->getBestIssueId()}" class="gbmn-ci-toc-btn">{translate key="issue.tableOfContents"}</a>
					</div>
				</div>
			</div>
		{/if}

		<div class="gbmn-sidebar-block">
			<div class="gbmn-sidebar-block-title">{translate key="navigation.archives"}</div>
			<div class="gbmn-sidebar-block-body">
				<a href="{url page="issue" op="archive"}" class="read-more">{translate key="common.browseAll" default="Browse all issues"} →</a>
			</div>
		</div>
	</aside>
</div>

{include file="frontend/components/footer.tpl"}

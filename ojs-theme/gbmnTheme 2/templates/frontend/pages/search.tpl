{**
 * templates/frontend/pages/search.tpl
 *
 * GBMN Theme — Search page
 *}
{include file="frontend/components/header.tpl" pageTitleTranslated=$translate->translate("common.search")}

<div class="gbmn-search-wrap">
	<h1 class="gbmn-section-title" style="margin-bottom:1.5rem;">{translate key="common.search"}</h1>

	<form action="{url page="search"}" method="get" role="search">
		<div class="gbmn-search-form">
			<input type="search" name="query" class="gbmn-search-input"
				   value="{$query|escape}" placeholder="{translate key="common.searchQuery"}...">
			<button type="submit" class="gbmn-search-submit">
				{translate key="common.search"}
			</button>
		</div>
	</form>

	{if $results}
		<p style="color:var(--gbmn-muted);margin-bottom:1.5rem;">
			{translate key="search.results.numResults" numResults=$numResults}
		</p>
		{foreach from=$results item=article}
			{include file="frontend/objects/article_summary.tpl" article=$article}
		{/foreach}

		{* Pagination *}
		{if $totalCount > $itemsPerPage}
			<div class="gbmn-pagination">
				{math assign=totalPages equation="ceil(x/y)" x=$totalCount y=$itemsPerPage}
				{section name=page start=1 loop=$totalPages step=1}
					{if $smarty.section.page.index+1 == $currentPage}
						<span class="current">{$smarty.section.page.index+1}</span>
					{else}
						<a href="{url page="search" query=$query page=$smarty.section.page.index+1}">{$smarty.section.page.index+1}</a>
					{/if}
				{/section}
			</div>
		{/if}
	{elseif $query}
		<div class="gbmn-flash info">{translate key="search.noResults"}</div>
	{/if}
</div>

{include file="frontend/components/footer.tpl"}

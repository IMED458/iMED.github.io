<?php

/**
 * @file plugins/themes/gbmnTheme/GbmnThemePlugin.php
 *
 * Copyright (c) 2024 Georgian Biomedical and Medical Nexus
 * Distributed under the GNU GPL v3.
 *
 * @class GbmnThemePlugin
 * @ingroup plugins_themes_gbmn
 *
 * @brief GBMN journal theme plugin — matches the gbmnsubmit.github.io design.
 */

use APP\core\Application;
use PKP\plugins\ThemePlugin;

class GbmnThemePlugin extends ThemePlugin
{
    public function isActive()
    {
        if (defined('SESSION_DISABLE_INIT')) {
            return true;
        }
        return parent::isActive();
    }

    public function init()
    {
        // Colour palette options
        $this->addOption('accentColor', 'colour', [
            'label' => 'plugins.themes.gbmn.option.accentColor.label',
            'description' => 'plugins.themes.gbmn.option.accentColor.description',
            'default' => '#1e3a8a',
        ]);

        $this->addOption('topBarBg', 'colour', [
            'label' => 'plugins.themes.gbmn.option.topBarBg.label',
            'default' => '#0f172a',
        ]);

        $this->addOption('heroHeadline', 'text', [
            'label' => 'plugins.themes.gbmn.option.heroHeadline.label',
            'default' => '',
        ]);

        $this->addOption('heroSubtitle', 'text', [
            'label' => 'plugins.themes.gbmn.option.heroSubtitle.label',
            'default' => '',
        ]);

        $this->addOption('issnPrint', 'text', [
            'label' => 'plugins.themes.gbmn.option.issnPrint.label',
            'default' => '',
        ]);

        $this->addOption('issnFormerName', 'text', [
            'label' => 'plugins.themes.gbmn.option.issnFormerName.label',
            'default' => '',
        ]);

        // Enqueue main stylesheet
        $this->addStyle('stylesheet', 'styles/index.css');

        // Enqueue JavaScript
        $this->addScript('main', 'js/main.js');

        // Pass theme options as CSS variables
        $accentColor = $this->getOption('accentColor') ?: '#1e3a8a';
        $topBarBg    = $this->getOption('topBarBg')    ?: '#0f172a';
        $this->addStyle('theme-vars', '
            :root {
                --gbmn-accent:      ' . htmlspecialchars($accentColor) . ';
                --gbmn-accent-dark: color-mix(in srgb, ' . htmlspecialchars($accentColor) . ' 80%, black);
                --gbmn-topbar-bg:   ' . htmlspecialchars($topBarBg) . ';
            }
        ', ['inline' => true]);

        // Pass hero text to templates
        $templateMgr = \APP\template\TemplateManager::getManager();
        $templateMgr->assign([
            'gbmnHeroHeadline' => $this->getOption('heroHeadline'),
            'gbmnHeroSubtitle' => $this->getOption('heroSubtitle'),
            'gbmnIssnPrint'    => $this->getOption('issnPrint'),
            'gbmnFormerName'   => $this->getOption('issnFormerName'),
        ]);
    }

    public function getDisplayName()
    {
        return __('plugins.themes.gbmn.name');
    }

    public function getDescription()
    {
        return __('plugins.themes.gbmn.description');
    }

    public function getInstallEmailsFilename()
    {
        return null;
    }
}

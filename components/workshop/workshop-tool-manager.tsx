'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  APPROVED_WORKSHOP_CATEGORIES,
  ApprovedWorkshopCategory,
  EnvironmentProfileId,
  ENVIRONMENT_PROFILES,
  TOOL_CATALOGUE,
  ApprovedTool,
  validateAndResolveTools,
  getProfileForCategory,
  getAvailableToolsForProfile,
} from '@/lib/workshop/tool-catalogue';
import {
  ShieldCheck,
  Cpu,
  Monitor,
  Terminal,
  Search,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Layers,
  Flame,
  Database,
  TerminalSquare,
} from 'lucide-react';

interface WorkshopToolManagerProps {
  category: ApprovedWorkshopCategory;
  selectedToolIds: string[];
  onChange: (toolIds: string[], profileId: EnvironmentProfileId) => void;
  onSave?: (toolIds: string[]) => Promise<void>;
  isSaving?: boolean;
  readOnly?: boolean;
  environmentVersion?: number;
  environmentStatus?: string;
}

export function WorkshopToolManager({
  category,
  selectedToolIds,
  onChange,
  onSave,
  isSaving = false,
  readOnly = false,
  environmentVersion = 1,
  environmentStatus = 'READY',
}: WorkshopToolManagerProps) {
  const profileId = getProfileForCategory(category);
  const profile = ENVIRONMENT_PROFILES[profileId];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cli' | 'gui'>('all');

  // Compute validation and resolved dependencies
  const validation = useMemo(() => {
    return validateAndResolveTools(profileId, selectedToolIds);
  }, [profileId, selectedToolIds]);

  // Available catalogue for this profile
  const availableCatalogue = useMemo(() => {
    return getAvailableToolsForProfile(profileId);
  }, [profileId]);

  // Filter catalogue for search
  const filteredCatalogue = useMemo(() => {
    return availableCatalogue.filter((t) => {
      const isSelected = selectedToolIds.includes(t.id);
      if (isSelected) return false;

      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.package.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === 'all' ||
        (filterType === 'gui' && t.requiresDesktop) ||
        (filterType === 'cli' && !t.requiresDesktop);

      return matchesSearch && matchesType;
    });
  }, [availableCatalogue, selectedToolIds, searchQuery, filterType]);

  const handleAddTool = (toolId: string) => {
    if (readOnly) return;
    const nextIds = Array.from(new Set([...selectedToolIds, toolId]));
    const result = validateAndResolveTools(profileId, nextIds);
    onChange(result.resolvedToolIds, profileId);
  };

  const handleRemoveTool = (toolId: string) => {
    if (readOnly) return;
    if (profile.mandatoryToolIds.includes(toolId)) return;
    const nextIds = selectedToolIds.filter((id) => id !== toolId);
    const result = validateAndResolveTools(profileId, nextIds);
    onChange(result.resolvedToolIds, profileId);
  };

  const handleResetToDefaults = () => {
    if (readOnly) return;
    const defaults = profile.defaultToolIds;
    const result = validateAndResolveTools(profileId, defaults);
    onChange(result.resolvedToolIds, profileId);
  };

  const categoryIcons: Record<ApprovedWorkshopCategory, React.ReactNode> = {
    Cybersecurity: <Flame className="w-5 h-5 text-red-500" />,
    'Data Science': <Database className="w-5 h-5 text-emerald-500" />,
    Linux: <TerminalSquare className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className="space-y-6">
      {/* 1. Environment Profile Header Banner */}
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-900/50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                {categoryIcons[category] || <Cpu className="w-5 h-5 text-[#4285F4]" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {profile.name}
                  </h3>
                  <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                    v{environmentVersion}
                  </Badge>
                  <Badge
                    variant={environmentStatus === 'READY' ? 'success' : 'warning'}
                    size="sm"
                    className="text-[10px]"
                  >
                    {environmentStatus === 'READY' ? 'Environment Ready' : environmentStatus}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {profile.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToDefaults}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Defaults
                </Button>
              )}
              {onSave && !readOnly && (
                <Button
                  size="sm"
                  isLoading={isSaving}
                  onClick={() => onSave(validation.resolvedToolIds)}
                  className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#4285F4]"
                >
                  Save Toolset
                </Button>
              )}
            </div>
          </div>

          {/* Specs & Capabilities Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Base Container
              </span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                {profile.baseImage}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Access Method
              </span>
              <span className="font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                {validation.requiresDesktop ? (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-purple-500" />
                    Web Desktop & Terminal
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    Web Terminal
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Configured Tools
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {validation.resolvedTools.length} preinstalled
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Resource Bounds
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {profile.resourceLimits.memoryMb}MB RAM • {profile.resourceLimits.nanoCpus / 1e9} CPU
              </span>
            </div>
          </div>

          {/* Target Environment / Domain Notices */}
          {profile.targetEnvironmentNotice && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Target Boundary: </span>
                {profile.targetEnvironmentNotice}
              </div>
            </div>
          )}

          {profile.powerBiNotice && (
            <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-200">
              <Info className="w-4 h-4 text-[#4285F4] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Power BI Integration Note: </span>
                {profile.powerBiNotice}
              </div>
            </div>
          )}

          {/* Validation Warnings (e.g. dependencies auto-added) */}
          {validation.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {validation.warnings.map((warn, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Selected Tools Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4285F4]" />
                Selected Preinstalled Tools ({validation.resolvedTools.length})
              </CardTitle>
              <CardDescription className="text-xs">
                These tools are provisioned and verified in the cloud sandbox before participants launch.
              </CardDescription>
            </div>
            {validation.requiresDesktop && (
              <Badge variant="outline" size="sm" className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px]">
                GUI Desktop Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {validation.resolvedTools.map((tool) => {
              const isMandatory = tool.isMandatory || profile.mandatoryToolIds.includes(tool.id);
              const isDefault = tool.isDefault;

              return (
                <div
                  key={tool.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {tool.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tool.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {tool.requiresDesktop && (
                          <Badge variant="outline" size="sm" className="text-[9px] px-1 py-0 border-purple-500/40 text-purple-500">
                            GUI
                          </Badge>
                        )}
                        {isDefault && (
                          <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tool.description}
                    </p>

                    <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{tool.verificationCommand}</span>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tool.package}
                    </span>

                    {isMandatory ? (
                      <span
                        className="text-[10px] text-slate-400 flex items-center gap-1"
                        title="Mandatory system tool: essential for container runtime integrity."
                      >
                        <Lock className="w-3 h-3 text-slate-400" /> Core Tool
                      </span>
                    ) : !readOnly ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveTool(tool.id)}
                        className="h-6 px-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Catalogue Explorer to Add Approved Tools */}
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Add Tools from Approved Catalogue
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose trusted utilities curated for {profile.name}. Dependencies are automatically resolved.
                </CardDescription>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All ({availableCatalogue.filter((t) => !selectedToolIds.includes(t.id)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('cli')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    filterType === 'cli'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  CLI
                </button>
                {profile.desktopAccessSupported && (
                  <button
                    type="button"
                    onClick={() => setFilterType('gui')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      filterType === 'gui'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    GUI Desktop
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="pt-2">
              <Input
                placeholder={`Search catalogue for ${profile.name} (e.g., nmap, wireshark, scikit-learn)...`}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredCatalogue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {searchQuery
                  ? 'No approved tools matching your search.'
                  : 'All available tools in this catalogue are already selected.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCatalogue.map((tool) => (
                  <div
                    key={tool.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {tool.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {tool.requiresDesktop && (
                            <Badge variant="outline" size="sm" className="text-[9px] px-1 py-0 border-purple-500/40 text-purple-500">
                              GUI Desktop
                            </Badge>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {tool.version}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {tool.description}
                      </p>

                      {tool.dependencies && tool.dependencies.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <span>Depends on:</span>
                          <span className="font-mono text-slate-500">
                            {tool.dependencies.map((d) => TOOL_CATALOGUE[d]?.name || d).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tool.installationMethod}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAddTool(tool.id)}
                        className="h-6 px-2 text-xs text-[#1a73e8] hover:text-[#1557b0] dark:text-[#4285F4]"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Tool
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

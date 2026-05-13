# pnpm-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T16:07:59.128Z
Repository: https://github.com/pnpm/pnpm.git
Baseline: v10.8.1 (f337e71)
Current: v10.9.0 (a4ba06d)
Source scope: include **/src/**; exclude **/test/**, **/__tests__/**, **/example/**, **/*.test.ts, **/*.spec.ts, **/*.test.tsx, **/*.spec.tsx
Inference: group-by workspace

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v10.8.1 | f337e71 | n/a | 174 | 1502 | 0 | 124 |
| v10.9.0 | a4ba06d | n/a | 174 | 1499 | 0 | 124 |

## Drift

- New observed edges: 0
- Removed observed edges: 4

### New Observed Edges
- None

### Removed Observed Edges
- `Core -> WhichVersionIsPinned`
  - previously via `pkg-manager/core/src/parseWantedDependencies.ts:3` importing `@pnpm/which-version-is-pinned`
- `ManifestUtils -> Error`
  - previously via `pkg-manifest/manifest-utils/src/getPref.ts:1` importing `@pnpm/error`
- `ResolveDependencies -> PickFetcher`
  - previously via `pkg-manager/resolve-dependencies/src/updateProjectManifest.ts:9` importing `@pnpm/pick-fetcher`
- `ResolveDependencies -> WhichVersionIsPinned`
  - previously via `pkg-manager/resolve-dependencies/src/getWantedDependencies.ts:8` importing `@pnpm/which-version-is-pinned`

## Advisory Warnings

- Warning counts: coupling_concentration: 124
- `coupling_concentration` at `no location`: AssertProject has concentrated fan-out to 4 modules. Observed: AssertProject fan-out to 4 modules. Incoming: Prepare.
- `coupling_concentration` at `no location`: Audit has concentrated fan-out to 9 modules. Observed: Audit fan-out to 9 modules. Incoming: PluginCommandsAudit.
- `coupling_concentration` at `no location`: BuildModules has concentrated fan-out to 12 modules. Observed: BuildModules fan-out to 12 modules. Incoming: Core, Headless.
- `coupling_concentration` at `no location`: Cache2 has concentrated fan-out to 6 modules. Observed: Cache2 fan-out to 6 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: CafsTypes has concentrated fan-in from 7 modules. Observed: CafsTypes fan-in from 7 modules. Incoming: CreateCafsStore, FetcherBase, PackageRequester, Store, StoreControllerTypes, TarballFetcher, Worker.
- `coupling_concentration` at `no location`: CalcDepState has concentrated fan-in from 4 modules and fan-out to 6 modules. Observed: CalcDepState fan-in 4, fan-out 6. Incoming: BuildModules, Core, Headless, PluginCommandsRebuild.
- `coupling_concentration` at `no location`: Catalogs2 has concentrated fan-in from 10 modules. Observed: Catalogs2 fan-in from 10 modules. Incoming: Catalogs3, Catalogs4, Config, Core, ExportableManifest, Lockfile6, Outdated, ParseOverrides, PluginCommandsPublishing, ResolveDependencies.
- `coupling_concentration` at `no location`: Catalogs3 has concentrated fan-in from 4 modules. Observed: Catalogs3 fan-in from 4 modules. Incoming: ExportableManifest, Outdated, ParseOverrides, ResolveDependencies.
- `coupling_concentration` at `no location`: Client has concentrated fan-in from 8 modules and fan-out to 9 modules. Observed: Client fan-in 8, fan-out 9. Incoming: Outdated, PluginCommandsPublishing, PluginCommandsScriptRunners, PluginCommandsStoreInspecting, Pnpm, StoreConnectionManager, Testing, Tools2.
- `coupling_concentration` at `no location`: CliMeta has concentrated fan-in from 9 modules. Observed: CliMeta fan-in from 9 modules. Incoming: CliUtils, DefaultReporter, Env, PluginCommandsInit, PluginCommandsServer, PluginCommandsSetup, Pnpm, StoreConnectionManager, Tools2.
- `coupling_concentration` at `no location`: CliUtils has concentrated fan-in from 22 modules and fan-out to 12 modules. Observed: CliUtils fan-in 22, fan-out 12. Incoming: Cache2, PluginCommandsAudit, PluginCommandsCompletion, PluginCommandsConfig, PluginCommandsDeploy, PluginCommandsDoctor, PluginCommandsEnv, PluginCommandsInit, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsListing, PluginCommandsOutdated, PluginCommandsPatching, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsServer, PluginCommandsSetup, PluginCommandsStore, Pnpm, Tools2, Workspace4.
- `coupling_concentration` at `no location`: Command has concentrated fan-in from 6 modules. Observed: Command fan-in from 6 modules. Incoming: PluginCommandsCompletion, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsOutdated, PluginCommandsScriptRunners, Pnpm.
- `coupling_concentration` at `no location`: CommonCliOptionsHelp has concentrated fan-in from 10 modules. Observed: CommonCliOptionsHelp fan-in from 10 modules. Incoming: PluginCommandsDeploy, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsListing, PluginCommandsOutdated, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsServer, Pnpm.
- `coupling_concentration` at `no location`: Config has concentrated fan-in from 27 modules and fan-out to 11 modules. Observed: Config fan-in 27, fan-out 11. Incoming: Cache2, CliUtils, DefaultReporter, Deps3, Exec2, MountModules, PluginCommandsAudit, PluginCommandsConfig, PluginCommandsDeploy, PluginCommandsDoctor, PluginCommandsEnv, PluginCommandsInit, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsListing, PluginCommandsOutdated, PluginCommandsPatching, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsServer, PluginCommandsStore, PluginCommandsStoreInspecting, Pnpm, StoreConnectionManager, Tools2, Workspace5.
- `coupling_concentration` at `no location`: Config2 has concentrated fan-in from 5 modules. Observed: Config2 fan-in from 5 modules. Incoming: Config3, Exec2, PluginCommandsAudit, PluginCommandsInstallation, PluginCommandsPatching.
- `coupling_concentration` at `no location`: Config3 has concentrated fan-out to 12 modules. Observed: Config3 fan-out to 12 modules. Incoming: CliUtils, PluginCommandsInstallation.
- `coupling_concentration` at `no location`: Constants has concentrated fan-in from 26 modules. Observed: Constants fan-in from 26 modules. Incoming: AssertProject, Cache2, CalcDepState, Config, Core, Deps, Deps3, Error, GetContext, Headless, Hoist, Lockfile10, Lockfile3, Lockfile8, NpmResolver, Outdated, PluginCommandsAudit, PluginCommandsDeploy, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsRebuild, Pnpm, StorePath, Workspace, Workspace2, Workspace4.
- `coupling_concentration` at `no location`: Core has concentrated fan-out to 38 modules. Observed: Core fan-out to 38 modules. Incoming: PluginCommandsInstallation.
- `coupling_concentration` at `no location`: CoreLoggers has concentrated fan-in from 25 modules. Observed: CoreLoggers fan-in from 25 modules. Incoming: BuildModules, Config3, Core, DefaultReporter, Deps, Fetch, Fs2, GetContext, Headless, Hoist, Lifecycle, ManifestUtils, ModulesCleaner, NpmResolver, PackageIsInstallable, PackageRequester, PkgManager, PluginCommandsRebuild, PluginCommandsScriptRunners, Pnpm, Pnpmfile, RemoveBins, ResolveDependencies, SymlinkDependency, TarballFetcher.
- `coupling_concentration` at `no location`: CreateCafsStore has concentrated fan-out to 4 modules. Observed: CreateCafsStore fan-out to 4 modules. Incoming: Node, PackageStore, Worker.
- `coupling_concentration` at `no location`: Crypto2 has concentrated fan-in from 8 modules. Observed: Crypto2 fan-in from 8 modules. Incoming: DependencyPath, LocalResolver, Lockfile5, Lockfile6, NpmResolver, PluginCommandsPatching, PluginCommandsScriptRunners, Pnpmfile.
- `coupling_concentration` at `no location`: Dedupe3 has concentrated fan-out to 4 modules. Observed: Dedupe3 fan-out to 4 modules. Incoming: PluginCommandsInstallation.
- `coupling_concentration` at `no location`: DefaultReporter has concentrated fan-out to 9 modules. Observed: DefaultReporter fan-out to 9 modules. Incoming: CliUtils, Pnpm.
- `coupling_concentration` at `no location`: DefaultResolver has concentrated fan-out to 7 modules. Observed: DefaultResolver fan-out to 7 modules. Incoming: Client.
- `coupling_concentration` at `no location`: DependencyPath has concentrated fan-in from 24 modules. Observed: DependencyPath fan-in from 24 modules. Incoming: CalcDepState, Deps, Headless, Hoist, LicenseScanner, Lockfile10, Lockfile11, Lockfile3, Lockfile4, Lockfile6, Lockfile7, Lockfile8, LockfileToPnp, ModulesCleaner, MountModules, Outdated, PackageRequester, Patching2, PluginCommandsDeploy, PluginCommandsRebuild, PluginCommandsStore, RealHoist, ResolveDependencies, Reviewing.
- `coupling_concentration` at `no location`: Deps has concentrated fan-out to 12 modules. Observed: Deps fan-out to 12 modules. Incoming: Headless.
- `coupling_concentration` at `no location`: Deps3 has concentrated fan-out to 16 modules. Observed: Deps3 fan-out to 16 modules. Incoming: PluginCommandsInstallation, PluginCommandsScriptRunners.
- `coupling_concentration` at `no location`: DirectoryFetcher has concentrated fan-in from 5 modules and fan-out to 6 modules. Observed: DirectoryFetcher fan-in 5, fan-out 6. Incoming: Client, LicenseScanner, Lifecycle, PluginCommandsDeploy, Workspace7.
- `coupling_concentration` at `no location`: Error has concentrated fan-in from 64 modules. Observed: Error fan-in from 64 modules. Incoming: Audit, Cache2, Catalogs3, Catalogs4, CliUtils, Config, Config3, Core, Dedupe3, DefaultReporter, DefaultResolver, Deps3, ExportableManifest, FilterWorkspacePackages, FindWorkspaceDir, LicenseScanner, Lifecycle, LinkBins, LocalResolver, Lockfile3, Lockfile8, MakeDedicatedLockfile, Network, Node, NpmResolver, Outdated, PackageIsInstallable, PackageRequester, ParseCliArgs, ParseOverrides, Patching2, Patching3, PluginCommandsAudit, PluginCommandsCompletion, PluginCommandsConfig, PluginCommandsDeploy, PluginCommandsEnv, PluginCommandsInit, PluginCommandsInstallation, PluginCommandsLicenses, PluginCommandsListing, PluginCommandsOutdated, PluginCommandsPatching, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsServer, PluginCommandsStore, PluginCommandsStoreInspecting, Pnpm, Pnpmfile, PreparePackage, ReadPackageJson, ReadProjectManifest, RealHoist, RenderPeerIssues, ResolveDependencies, StoreConnectionManager, StorePath, TarballFetcher, Tools2, Worker, Workspace, Workspace7.
- `coupling_concentration` at `no location`: Exec2 has concentrated fan-out to 6 modules. Observed: Exec2 fan-out to 6 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: ExportableManifest has concentrated fan-out to 5 modules. Observed: ExportableManifest fan-out to 5 modules. Incoming: MakeDedicatedLockfile, PluginCommandsPublishing.
- `coupling_concentration` at `no location`: Fetch has concentrated fan-in from 6 modules. Observed: Fetch fan-in from 6 modules. Incoming: Audit, Client, Config3, GitResolver, PluginCommandsEnv, Server.
- `coupling_concentration` at `no location`: FetcherBase has concentrated fan-in from 8 modules. Observed: FetcherBase fan-in from 8 modules. Incoming: Client, DirectoryFetcher, GitFetcher, PackageRequester, PackageStore, PickFetcher, Pnpmfile, TarballFetcher.
- `coupling_concentration` at `no location`: FetchingTypes has concentrated fan-in from 9 modules. Observed: FetchingTypes fan-in from 9 modules. Incoming: Audit, Client, DefaultResolver, Fetch, Node, Node2, NpmResolver, TarballFetcher, TarballResolver.
- `coupling_concentration` at `no location`: FilterWorkspacePackages has concentrated fan-out to 5 modules. Observed: FilterWorkspacePackages fan-out to 5 modules. Incoming: PluginCommandsInstallation, Pnpm, Workspace8.
- `coupling_concentration` at `no location`: Fs2 has concentrated fan-out to 4 modules. Observed: Fs2 fan-out to 4 modules. Incoming: CreateCafsStore, PluginCommandsDeploy.
- `coupling_concentration` at `no location`: Fs3 has concentrated fan-in from 5 modules. Observed: Fs3 fan-in from 5 modules. Incoming: DirectoryFetcher, GitFetcher, PluginCommandsPatching, PluginCommandsPublishing, TarballFetcher.
- `coupling_concentration` at `no location`: GetContext has concentrated fan-in from 6 modules and fan-out to 8 modules. Observed: GetContext fan-in 6, fan-out 8. Incoming: Core, Deps3, Lockfile6, PluginCommandsInstallation, PluginCommandsRebuild, PluginCommandsStore.
- `coupling_concentration` at `no location`: GitFetcher has concentrated fan-out to 5 modules. Observed: GitFetcher fan-out to 5 modules. Incoming: Client.
- `coupling_concentration` at `no location`: GracefulFs has concentrated fan-in from 10 modules. Observed: GracefulFs fan-in from 10 modules. Incoming: Crypto2, Fs2, NpmResolver, PackageRequester, PluginCommandsInstallation, PluginCommandsStoreInspecting, ReadProjectManifest, Store, TarballFetcher, Worker.
- `coupling_concentration` at `no location`: Headless has concentrated fan-out to 26 modules. Observed: Headless fan-out to 26 modules. Incoming: Core.
- `coupling_concentration` at `no location`: Hoist has concentrated fan-out to 9 modules. Observed: Hoist fan-out to 9 modules. Incoming: Core, Headless.
- `coupling_concentration` at `no location`: Hooks2 has concentrated fan-out to 5 modules. Observed: Hooks2 fan-out to 5 modules. Incoming: Core, Outdated.
- `coupling_concentration` at `no location`: LicenseScanner has concentrated fan-out to 12 modules. Observed: LicenseScanner fan-out to 12 modules. Incoming: PluginCommandsLicenses.
- `coupling_concentration` at `no location`: Lifecycle has concentrated fan-in from 7 modules and fan-out to 8 modules. Observed: Lifecycle fan-in 7, fan-out 8. Incoming: BuildModules, Core, Headless, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PreparePackage.
- `coupling_concentration` at `no location`: LinkBins has concentrated fan-in from 7 modules and fan-out to 8 modules. Observed: LinkBins fan-in 7, fan-out 8. Incoming: BuildModules, Core, Headless, Hoist, Lifecycle, PluginCommandsRebuild, Tools2.
- `coupling_concentration` at `no location`: List has concentrated fan-out to 5 modules. Observed: List fan-out to 5 modules. Incoming: PluginCommandsListing.
- `coupling_concentration` at `no location`: LocalResolver has concentrated fan-out to 6 modules. Observed: LocalResolver fan-out to 6 modules. Incoming: DefaultResolver.
- `coupling_concentration` at `no location`: Lockfile has concentrated fan-in from 22 modules. Observed: Lockfile fan-in from 22 modules. Incoming: AssertProject, Audit, CalcDepState, Dedupe3, Hooks, LicenseScanner, Lockfile10, Lockfile11, Lockfile2, Lockfile3, Lockfile4, Lockfile5, Lockfile6, Lockfile7, Lockfile8, ModulesCleaner, PluginCommandsDeploy, PluginCommandsInstallation, PluginCommandsRebuild, PluginCommandsStoreInspecting, Pnpmfile, ResolveDependencies.
- `coupling_concentration` at `no location`: Lockfile10 has concentrated fan-out to 4 modules. Observed: Lockfile10 fan-out to 4 modules. Incoming: MakeDedicatedLockfile, ResolveDependencies.
- `coupling_concentration` at `no location`: Lockfile3 has concentrated fan-in from 17 modules and fan-out to 9 modules. Observed: Lockfile3 fan-in 17, fan-out 9. Incoming: Core, Deps, Deps3, GetContext, Headless, LicenseScanner, LockfileToPnp, MakeDedicatedLockfile, MountModules, Outdated, PluginCommandsAudit, PluginCommandsDeploy, PluginCommandsLicenses, PluginCommandsPatching, ReadProjectsContext, Reviewing, Updater.
- `coupling_concentration` at `no location`: Lockfile4 has concentrated fan-in from 19 modules and fan-out to 5 modules. Observed: Lockfile4 fan-in 19, fan-out 5. Incoming: Audit, Core, Deps, Headless, Hoist, LicenseScanner, Lockfile6, Lockfile8, Lockfile9, LockfileToPnp, ModulesCleaner, MountModules, Outdated, PluginCommandsPatching, PluginCommandsRebuild, PluginCommandsStore, RealHoist, ResolveDependencies, Reviewing.
- `coupling_concentration` at `no location`: Lockfile6 has concentrated fan-out to 9 modules. Observed: Lockfile6 fan-out to 9 modules. Incoming: Core, Deps3.
- `coupling_concentration` at `no location`: Lockfile7 has concentrated fan-in from 5 modules. Observed: Lockfile7 fan-in from 5 modules. Incoming: Audit, Hoist, LicenseScanner, Lockfile8, PluginCommandsRebuild.
- `coupling_concentration` at `no location`: Lockfile8 has concentrated fan-out to 9 modules. Observed: Lockfile8 fan-out to 9 modules. Incoming: Core, Headless, ModulesCleaner.
- `coupling_concentration` at `no location`: Lockfile9 has concentrated fan-out to 4 modules. Observed: Lockfile9 fan-out to 4 modules. Incoming: Core, ResolveDependencies.
- `coupling_concentration` at `no location`: LockfileToPnp has concentrated fan-out to 4 modules. Observed: LockfileToPnp fan-out to 4 modules. Incoming: Core, Headless.
- `coupling_concentration` at `no location`: Logger has concentrated fan-in from 49 modules. Observed: Logger fan-in from 49 modules. Incoming: BuildModules, CliUtils, Config, Core, CoreLoggers, DefaultReporter, Deps, Deps3, DirectoryFetcher, Exec2, Fs, Fs2, GetContext, GitFetcher, Headless, Hoist, Lifecycle, LinkBins, LocalResolver, Lockfile3, Lockfile8, ModulesCleaner, NpmResolver, PackageRequester, PackageStore, Patching2, Patching3, PluginCommandsDeploy, PluginCommandsDoctor, PluginCommandsEnv, PluginCommandsInstallation, PluginCommandsListing, PluginCommandsPatching, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsServer, PluginCommandsSetup, PluginCommandsStore, Pnpm, Pnpmfile, ResolveDependencies, Server, StoreConnectionManager, TarballFetcher, Tools2, Workspace4, Workspace5, Workspace7.
- `coupling_concentration` at `no location`: MakeDedicatedLockfile has concentrated fan-out to 7 modules. Observed: MakeDedicatedLockfile fan-out to 7 modules.
- `coupling_concentration` at `no location`: ManifestUtils has concentrated fan-in from 7 modules. Observed: ManifestUtils fan-in from 7 modules. Incoming: CliUtils, Core, LinkBins, Lockfile9, Outdated, PluginCommandsInstallation, ResolveDependencies.
- `coupling_concentration` at `no location`: Matcher has concentrated fan-in from 8 modules. Observed: Matcher fan-in from 8 modules. Incoming: Config, FilterWorkspacePackages, Hoist, Hooks2, Outdated, PluginCommandsInstallation, RenderPeerIssues, Reviewing.
- `coupling_concentration` at `no location`: ModulesCleaner has concentrated fan-out to 10 modules. Observed: ModulesCleaner fan-out to 10 modules. Incoming: Core, Headless.
- `coupling_concentration` at `no location`: ModulesYaml has concentrated fan-in from 12 modules. Observed: ModulesYaml fan-in from 12 modules. Incoming: AssertProject, Core, Deps, Exec2, GetContext, Headless, Outdated, PluginCommandsPatching, PluginCommandsRebuild, ReadProjectsContext, Reviewing, Workspace7.
- `coupling_concentration` at `no location`: MountModules has concentrated fan-out to 7 modules. Observed: MountModules fan-out to 7 modules.
- `coupling_concentration` at `no location`: Network has concentrated fan-in from 4 modules. Observed: Network fan-in from 4 modules. Incoming: Client, Config3, PluginCommandsAudit, PluginCommandsPublishing.
- `coupling_concentration` at `no location`: Node has concentrated fan-out to 5 modules. Observed: Node fan-out to 5 modules. Incoming: PluginCommandsEnv.
- `coupling_concentration` at `no location`: NormalizeRegistries has concentrated fan-in from 5 modules. Observed: NormalizeRegistries fan-in from 5 modules. Incoming: Core, PluginCommandsRebuild, PluginCommandsStore, ReadProjectsContext, Reviewing.
- `coupling_concentration` at `no location`: NpmResolver has concentrated fan-in from 6 modules and fan-out to 12 modules. Observed: NpmResolver fan-in 6, fan-out 12. Incoming: Cache, Config3, DefaultResolver, Outdated, ResolveDependencies, Workspace6.
- `coupling_concentration` at `no location`: Object has concentrated fan-in from 6 modules. Observed: Object fan-in from 6 modules. Incoming: CalcDepState, Lockfile3, PluginCommandsConfig, PluginCommandsInit, PluginCommandsStoreInspecting, Updater.
- `coupling_concentration` at `no location`: Outdated has concentrated fan-out to 16 modules. Observed: Outdated fan-out to 16 modules. Incoming: PluginCommandsInstallation, PluginCommandsOutdated.
- `coupling_concentration` at `no location`: PackageBins has concentrated fan-in from 4 modules. Observed: PackageBins fan-in from 4 modules. Incoming: LinkBins, PluginCommandsPublishing, PluginCommandsScriptRunners, RemoveBins.
- `coupling_concentration` at `no location`: PackageIsInstallable has concentrated fan-in from 6 modules and fan-out to 4 modules. Observed: PackageIsInstallable fan-in 6, fan-out 4. Incoming: CliUtils, Deps, Headless, LicenseScanner, Lockfile8, PackageRequester.
- `coupling_concentration` at `no location`: PackageRequester has concentrated fan-out to 15 modules. Observed: PackageRequester fan-out to 15 modules. Incoming: PackageStore.
- `coupling_concentration` at `no location`: PackageStore has concentrated fan-in from 4 modules and fan-out to 8 modules. Observed: PackageStore fan-in 4, fan-out 8. Incoming: Config3, PluginCommandsInstallation, StoreConnectionManager, Testing.
- `coupling_concentration` at `no location`: ParseOverrides has concentrated fan-in from 7 modules and fan-out to 4 modules. Observed: ParseOverrides fan-in 7, fan-out 4. Incoming: Core, Deps3, Hooks2, Lockfile5, Outdated, RenderPeerIssues, Updater.
- `coupling_concentration` at `no location`: ParseWantedDependency has concentrated fan-in from 9 modules. Observed: ParseWantedDependency fan-in from 9 modules. Incoming: Config3, Core, Hooks2, ParseOverrides, PluginCommandsInstallation, PluginCommandsPatching, PluginCommandsScriptRunners, PluginCommandsStore, PluginCommandsStoreInspecting.
- `coupling_concentration` at `no location`: Patching has concentrated fan-in from 5 modules. Observed: Patching fan-in from 5 modules. Incoming: BuildModules, Deps, Lockfile, Patching2, ResolveDependencies.
- `coupling_concentration` at `no location`: Patching2 has concentrated fan-in from 4 modules and fan-out to 4 modules. Observed: Patching2 fan-in 4, fan-out 4. Incoming: Core, Deps, Headless, ResolveDependencies.
- `coupling_concentration` at `no location`: PickFetcher has concentrated fan-in from 4 modules. Observed: PickFetcher fan-in from 4 modules. Incoming: Lockfile4, Node, PackageRequester, PluginCommandsPatching.
- `coupling_concentration` at `no location`: PickRegistryForPackage has concentrated fan-in from 4 modules. Observed: PickRegistryForPackage fan-in from 4 modules. Incoming: Config3, NpmResolver, Outdated, PluginCommandsPublishing.
- `coupling_concentration` at `no location`: PluginCommandsAudit has concentrated fan-out to 9 modules. Observed: PluginCommandsAudit fan-out to 9 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsCompletion has concentrated fan-out to 7 modules. Observed: PluginCommandsCompletion fan-out to 7 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsConfig has concentrated fan-out to 6 modules. Observed: PluginCommandsConfig fan-out to 6 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsDeploy has concentrated fan-out to 14 modules. Observed: PluginCommandsDeploy fan-out to 14 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsEnv has concentrated fan-in from 4 modules and fan-out to 11 modules. Observed: PluginCommandsEnv fan-in 4, fan-out 11. Incoming: PluginCommandsInstallation, PluginCommandsPublishing, PluginCommandsScriptRunners, Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsInit has concentrated fan-out to 7 modules. Observed: PluginCommandsInit fan-out to 7 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsInstallation has concentrated fan-in from 4 modules and fan-out to 33 modules. Observed: PluginCommandsInstallation fan-in 4, fan-out 33. Incoming: PluginCommandsDeploy, PluginCommandsPatching, PluginCommandsScriptRunners, Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsLicenses has concentrated fan-out to 9 modules. Observed: PluginCommandsLicenses fan-out to 9 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsListing has concentrated fan-out to 7 modules. Observed: PluginCommandsListing fan-out to 7 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsOutdated has concentrated fan-out to 7 modules. Observed: PluginCommandsOutdated fan-out to 7 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsPatching has concentrated fan-out to 18 modules. Observed: PluginCommandsPatching fan-out to 18 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsPublishing has concentrated fan-out to 19 modules. Observed: PluginCommandsPublishing fan-out to 19 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsRebuild has concentrated fan-out to 26 modules. Observed: PluginCommandsRebuild fan-out to 26 modules. Incoming: Exec2, PluginCommandsInstallation, Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsScriptRunners has concentrated fan-out to 22 modules. Observed: PluginCommandsScriptRunners fan-out to 22 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsServer has concentrated fan-out to 9 modules. Observed: PluginCommandsServer fan-out to 9 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsStore has concentrated fan-out to 14 modules. Observed: PluginCommandsStore fan-out to 14 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: PluginCommandsStoreInspecting has concentrated fan-out to 9 modules. Observed: PluginCommandsStoreInspecting fan-out to 9 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: Pnpm has concentrated fan-out to 39 modules. Observed: Pnpm fan-out to 39 modules.
- `coupling_concentration` at `no location`: Pnpmfile has concentrated fan-in from 4 modules and fan-out to 9 modules. Observed: Pnpmfile fan-in 4, fan-out 9. Incoming: CliUtils, Config, Deps3, PluginCommandsInstallation.
- `coupling_concentration` at `no location`: PreparePackage has concentrated fan-out to 4 modules. Observed: PreparePackage fan-out to 4 modules. Incoming: GitFetcher, TarballFetcher.
- `coupling_concentration` at `no location`: ReadModulesDir has concentrated fan-in from 5 modules. Observed: ReadModulesDir fan-in from 5 modules. Incoming: Config3, LinkBins, ModulesCleaner, PkgManager, Reviewing.
- `coupling_concentration` at `no location`: ReadPackageJson has concentrated fan-in from 16 modules. Observed: ReadPackageJson fan-in from 16 modules. Incoming: BuildModules, Config3, Headless, LicenseScanner, Lifecycle, LinkBins, List, Lockfile6, PackageRequester, PluginCommandsPatching, PluginCommandsRebuild, PluginCommandsScriptRunners, PreparePackage, RemoveBins, ResolveDependencies, Reviewing.
- `coupling_concentration` at `no location`: ReadProjectManifest has concentrated fan-in from 16 modules and fan-out to 5 modules. Observed: ReadProjectManifest fan-in 16, fan-out 5. Incoming: Audit, CliUtils, Config, Config2, Core, DirectoryFetcher, ExportableManifest, Fs4, Headless, LinkBins, List, LocalResolver, MakeDedicatedLockfile, PluginCommandsInstallation, PluginCommandsScriptRunners, Tools2.
- `coupling_concentration` at `no location`: ReadProjectsContext has concentrated fan-out to 4 modules. Observed: ReadProjectsContext fan-out to 4 modules. Incoming: GetContext.
- `coupling_concentration` at `no location`: RemoveBins has concentrated fan-out to 4 modules. Observed: RemoveBins fan-out to 4 modules. Incoming: ModulesCleaner, PluginCommandsEnv.
- `coupling_concentration` at `no location`: RenderPeerIssues has concentrated fan-out to 4 modules. Observed: RenderPeerIssues fan-out to 4 modules. Incoming: DefaultReporter.
- `coupling_concentration` at `no location`: ResolveDependencies has concentrated fan-out to 19 modules. Observed: ResolveDependencies fan-out to 19 modules. Incoming: Core.
- `coupling_concentration` at `no location`: ResolverBase has concentrated fan-in from 19 modules. Observed: ResolverBase fan-in from 19 modules. Incoming: Core, DefaultResolver, Deps3, FetcherBase, GetContext, GitResolver, LocalResolver, Lockfile4, Lockfile6, Lockfile9, NpmResolver, PackageRequester, PackageStore, PickFetcher, PluginCommandsInstallation, PluginCommandsPublishing, ResolveDependencies, StoreControllerTypes, TarballResolver.
- `coupling_concentration` at `no location`: Reviewing has concentrated fan-out to 10 modules. Observed: Reviewing fan-out to 10 modules. Incoming: List.
- `coupling_concentration` at `no location`: SortPackages has concentrated fan-in from 4 modules. Observed: SortPackages fan-in from 4 modules. Incoming: PluginCommandsInstallation, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners.
- `coupling_concentration` at `no location`: Store has concentrated fan-in from 11 modules. Observed: Store fan-in from 11 modules. Incoming: AssertStore, Cache, CreateCafsStore, LicenseScanner, MountModules, PackageRequester, PackageStore, PluginCommandsRebuild, PluginCommandsStore, PluginCommandsStoreInspecting, Worker.
- `coupling_concentration` at `no location`: StoreConnectionManager has concentrated fan-in from 6 modules and fan-out to 8 modules. Observed: StoreConnectionManager fan-in 6, fan-out 8. Incoming: CliUtils, PluginCommandsInstallation, PluginCommandsPatching, PluginCommandsRebuild, PluginCommandsServer, PluginCommandsStore.
- `coupling_concentration` at `no location`: StoreControllerTypes has concentrated fan-in from 16 modules. Observed: StoreControllerTypes fan-in from 16 modules. Incoming: BuildModules, Core, CreateCafsStore, Deps, Fs2, Headless, Lifecycle, ModulesCleaner, PackageRequester, PackageStore, PluginCommandsRebuild, PluginCommandsStore, Pnpmfile, ResolveDependencies, Server, Testing.
- `coupling_concentration` at `no location`: StorePath has concentrated fan-in from 9 modules. Observed: StorePath fan-in from 9 modules. Incoming: Cache2, MountModules, PluginCommandsEnv, PluginCommandsLicenses, PluginCommandsPatching, PluginCommandsServer, PluginCommandsStore, PluginCommandsStoreInspecting, StoreConnectionManager.
- `coupling_concentration` at `no location`: SymlinkDependency has concentrated fan-in from 4 modules. Observed: SymlinkDependency fan-in from 4 modules. Incoming: Core, Headless, PkgManager, Worker.
- `coupling_concentration` at `no location`: TarballFetcher has concentrated fan-out to 11 modules. Observed: TarballFetcher fan-out to 11 modules. Incoming: Client, Node.
- `coupling_concentration` at `no location`: Tools2 has concentrated fan-out to 10 modules. Observed: Tools2 fan-out to 10 modules. Incoming: Pnpm.
- `coupling_concentration` at `no location`: Types has concentrated fan-in from 95 modules. Observed: Types fan-in from 95 modules. Incoming: Audit, BuildModules, CafsTypes, CalcDepState, CliMeta, CliUtils, Client, Config, Config2, Config3, Core, CoreLoggers, Dedupe3, DefaultReporter, DependencyPath, Deps, Deps3, DirectoryFetcher, Exec, Exec2, ExportableManifest, Fetch, FetcherBase, FilterWorkspacePackages, Fs4, GetContext, Headless, Hoist, Hooks, Hooks2, LicenseScanner, Lifecycle, LinkBins, List, LocalResolver, Lockfile, Lockfile10, Lockfile11, Lockfile2, Lockfile3, Lockfile4, Lockfile6, Lockfile7, Lockfile8, Lockfile9, LockfileToPnp, MakeDedicatedLockfile, ManifestUtils, ModulesCleaner, ModulesYaml, MountModules, NormalizeRegistries, NpmResolver, Outdated, PackageBins, PackageIsInstallable, PackageRequester, PickRegistryForPackage, PluginCommandsAudit, PluginCommandsDeploy, PluginCommandsEnv, PluginCommandsInit, PluginCommandsInstallation, PluginCommandsListing, PluginCommandsOutdated, PluginCommandsPatching, PluginCommandsPublishing, PluginCommandsRebuild, PluginCommandsScriptRunners, PluginCommandsStore, Pnpm, Pnpmfile, Prepare, PreparePackage, ReadPackageJson, ReadProjectManifest, ReadProjectsContext, RemoveBins, RenderPeerIssues, ResolveDependencies, ResolverBase, Reviewing, SortPackages, Store, StoreControllerTypes, SymlinkDependency, TarballFetcher, Updater, Worker, Workspace, Workspace4, Workspace5, Workspace6, Workspace8, WriteProjectManifest.
- `coupling_concentration` at `no location`: Updater has concentrated fan-out to 5 modules. Observed: Updater fan-out to 5 modules.
- `coupling_concentration` at `no location`: Worker has concentrated fan-in from 9 modules and fan-out to 10 modules. Observed: Worker fan-in 9, fan-out 10. Incoming: BuildModules, Core, GitFetcher, Headless, PackageRequester, PackageStore, PluginCommandsRebuild, Pnpm, TarballFetcher.
- `coupling_concentration` at `no location`: Workspace has concentrated fan-in from 8 modules. Observed: Workspace fan-in from 8 modules. Incoming: Catalogs4, Config, Deps3, PluginCommandsCompletion, Scripts, Updater, Workspace2, Workspace8.
- `coupling_concentration` at `no location`: Workspace4 has concentrated fan-in from 6 modules and fan-out to 5 modules. Observed: Workspace4 fan-in 6, fan-out 5. Incoming: Deps3, FilterWorkspacePackages, PluginCommandsCompletion, PluginCommandsInstallation, Scripts, Workspace8.
- `coupling_concentration` at `no location`: Workspace7 has concentrated fan-out to 4 modules. Observed: Workspace7 fan-out to 4 modules. Incoming: PluginCommandsScriptRunners.
- `coupling_concentration` at `no location`: Workspace8 has concentrated fan-out to 4 modules. Observed: Workspace8 fan-out to 4 modules.

## Timings

- Clone baseline: 11182.4ms
- Clone current: 16019.8ms
- Infer baseline contract: 9203.9ms
- Baseline graph: 5934.7ms
- Diff JSON: 6815.2ms
- Observe Markdown: 4347.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.

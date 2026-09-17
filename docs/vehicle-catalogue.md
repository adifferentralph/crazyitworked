# Vehicle catalogue

Twenty-Two Parts stores its normalized vehicle catalogue in PostgreSQL. Marketplace and seller forms read the local database; normal user journeys do not call an external vehicle service.

## Primary production import

The production importer uses the version-locked `@meterapp/vehicle-db` offline snapshot. It combines documented government/open sources including NHTSA vPIC, UK DfT/DVLA, NZTA, Malaysia JPJ, EEA registration data, and the Dutch RDW register. The package exposes source names, source URLs, retrieval dates, regions, year ranges, and licence terms through `getDataSources()`.

The imported vehicle types are passenger cars, multipurpose passenger vehicles, and trucks. Motorcycles, buses, auto-rickshaws, and miscellaneous records are not imported into the parts fitment picker.

Run:

```bash
npm run db:migrate
npm run db:import:vehicles
npm run db:verify:vehicles
```

The import is idempotent. It upserts makes, models, model years, and base fitments and preserves existing detailed generations, trims, engines, transmissions, and drivetrains.

Licence and provenance: review the installed package README and its upstream source notes at https://github.com/MeterApp/vehicle-db before redistributing the raw snapshot. Source-specific attribution obligations still apply. Vehicle and manufacturer names are factual identifiers and may be trademarks of their owners.

## Optional upstream vPIC refresh

The repository retains a separate live vPIC refresh command for selected makes:

```bash
npm run db:import:vehicles:vpic -- --model-makes=Toyota,Honda,Ford --start-year=1996 --end-year=2027
```

vPIC is a U.S. government catalogue compiled from manufacturer submissions. It is useful for refreshing U.S.-market coverage, but it is not the only production source because it does not provide adequate model-year coverage for several globally important makes.

## Updating production

1. Review the locked `@meterapp/vehicle-db` version and upstream release/source notes.
2. Update the dependency only after reviewing licence/provenance changes.
3. Apply migrations.
4. Run `npm run db:import:vehicles` against the production database.
5. Run `npm run db:verify:vehicles`.
6. Confirm make → model → year in the progressive selector for every make in the verifier.

The verifier checks Toyota, Honda, Lexus, Mercedes-Benz, BMW, Volkswagen, Peugeot, Ford, Hyundai, KIA, Nissan, Land Rover, Mazda, Mitsubishi, BYD, and historic Saab coverage. It also checks key models and rejects duplicate base fitments.

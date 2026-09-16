# Vehicle catalogue data

Twenty-Two Parts stores vehicle catalogue records in PostgreSQL. Normal marketplace browsing does not call an external vehicle API.

## Primary source

The repeatable importer uses the U.S. National Highway Traffic Safety Administration Product Information Catalog and Vehicle Listing (NHTSA vPIC).

- API documentation: https://vpic.nhtsa.dot.gov/api/
- All makes endpoint: /vehicles/GetAllMakes?format=json
- Models endpoint: /vehicles/GetModelsForMakeId/{id}?format=json

vPIC publishes manufacturer-submitted vehicle information through a public U.S. government service. Review the current NHTSA terms and data notes before redistributing a full dataset. Manufacturer and model names may be trademarks of their owners; they are used only for factual vehicle identification.

A small names-only regional supplement covers relevant global and legacy makes that may not appear consistently in a U.S.-focused source. It is deliberately kept in the importer normalization module, not in React UI code.

## Import and refresh

Run npm run db:import:vehicles to refresh active makes. To import models for selected makes without making thousands of upstream calls, run:

    npm run db:import:vehicles -- --model-makes=Toyota,Honda,Peugeot

The command is idempotent. It inserts normalized records locally and never makes page rendering depend on vPIC availability.

Complete fitments remain local records composed from make, model, generation, year, trim, engine, transmission, and drivetrain. Imported makes or models do not imply a compatibility claim. A product is searchable by vehicle only after a complete local fitment has been created and linked.

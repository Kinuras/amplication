import * as path from "path";
import { builders } from "ast-types";
import { paramCase } from "param-case";
import { plural } from "pluralize";
import { Entity } from "../../../types";
import {
  addImports,
  getNamedProperties,
  importNames,
  interpolate,
} from "../../../util/ast";
import { readFile, relativeImportPath } from "../../../util/module";
import { DTOs } from "../../../resource/create-dtos";
import { EntityComponent } from "../../types";
import { createInput } from "../create-input";

const template = path.resolve(__dirname, "entity-component.template.tsx");

export async function createEntityComponent(
  entity: Entity,
  dtos: DTOs,
  entityToDirectory: Record<string, string>,
  dtoNameToPath: Record<string, string>
): Promise<EntityComponent> {
  const name = entity.name;
  const modulePath = `${entityToDirectory[entity.name]}/${name}.tsx`;
  const entityDTO = dtos[entity.name].entity;
  const dto = dtos[entity.name].updateInput;
  const dtoProperties = getNamedProperties(dto);
  const fieldsByName = Object.fromEntries(
    entity.fields.map((field) => [field.name, field])
  );
  const localEntityDTOId = builders.identifier(`T${entityDTO.id.name}`);
  const file = await readFile(template);
  interpolate(file, {
    COMPONENT_NAME: builders.identifier(name),
    ENTITY_NAME: builders.stringLiteral(entity.displayName),
    RESOURCE: builders.stringLiteral(paramCase(plural(entity.name))),
    ENTITY: localEntityDTOId,
    UPDATE_INPUT: dto.id,
    INPUTS: builders.jsxFragment(
      builders.jsxOpeningFragment(),
      builders.jsxClosingFragment(),
      dtoProperties.map((property) => {
        const field = fieldsByName[property.key.name];
        return createInput(field);
      })
    ),
    EDITABLE_PROPERTIES: builders.arrayExpression(
      dtoProperties.map((property) => builders.stringLiteral(property.key.name))
    ),
  });

  addImports(file, [
    builders.importDeclaration(
      [builders.importSpecifier(entityDTO.id, localEntityDTOId)],
      builders.stringLiteral(
        relativeImportPath(modulePath, dtoNameToPath[entityDTO.id.name])
      )
    ),
    importNames(
      [dto.id],
      relativeImportPath(modulePath, dtoNameToPath[dto.id.name])
    ),
  ]);

  return { name, file, modulePath };
}

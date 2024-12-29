import { type StructureBuilder } from 'sanity/desk';

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure = (S: StructureBuilder) => {
  return S.document()
    .documentId('root')
    .schemaType('root')
    .views([S.view.form(), S.view.component(() => null).title('Preview')]);
};

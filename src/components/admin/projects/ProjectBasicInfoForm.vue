<script setup lang="ts">
import { PROJECT_FORM_RULES as rules } from '../../../constants/projectFormRules'
import { PROJECT_STATUS_OPTIONS } from '../../../constants/projectStatuses'
import type { Category } from '../../../types/Category'
import type { ProjectFormData, ProjectFormErrors } from '../../../types/ProjectForm'

defineProps<{
  errors: ProjectFormErrors
  form: ProjectFormData
  categories: readonly Category[]
}>()
</script>

<template>
  <div class="form-section">
    <h2>Temel Bilgiler</h2>

    <div class="form-grid">
      <div class="form-group">
        <label for="title"> Proje Başlığı </label>

        <input
          id="title"
          :aria-invalid="Boolean(errors.title)"
          :aria-describedby="errors.title ? 'title-error' : undefined"
          v-model="form.title"
          :maxlength="rules.titleMax"
          type="text"
          placeholder="Örn: Modern Bioclimatic Pergola"
          required
        />
        <p v-if="errors.title" id="title-error" class="form-error" role="alert">
          {{ errors.title }}
        </p>
      </div>

      <div class="form-group">
        <label for="slug"> Proje adresi </label>

        <input
          id="slug"
          :aria-invalid="Boolean(errors.slug)"
          :aria-describedby="errors.slug ? 'slug-error' : undefined"
          v-model="form.slug"
          type="text"
          readonly
        />
        <p v-if="errors.slug" id="slug-error" class="form-error" role="alert">{{ errors.slug }}</p>
      </div>

      <fieldset
        class="form-group full-width category-options"
        :aria-describedby="errors.categoryIds ? 'category-error' : 'category-hint'"
      >
        <legend>Sistem kategorileri</legend>
        <p id="category-hint" class="file-info">
          Projede kullanılan tüm sistemleri seçin. En az bir kategori gereklidir.
        </p>
        <div class="category-options-grid">
          <label v-for="category in categories" :key="category.id" class="category-option">
            <input
              type="checkbox"
              name="category"
              :value="category.id"
              v-model="form.categoryIds"
              :aria-invalid="Boolean(errors.categoryIds)"
              :aria-describedby="errors.categoryIds ? 'category-error' : undefined"
            />
            <span>{{ category.name }}</span>
          </label>
        </div>
        <p v-if="errors.categoryIds" id="category-error" class="form-error" role="alert">
          {{ errors.categoryIds }}
        </p>
      </fieldset>

      <div class="form-group">
        <label for="status"> Durum </label>

        <select
          id="status"
          :aria-invalid="Boolean(errors.status)"
          :aria-describedby="errors.status ? 'status-error' : undefined"
          v-model="form.status"
        >
          <option
            v-for="status in PROJECT_STATUS_OPTIONS"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>
        <p v-if="errors.status" id="status-error" class="form-error" role="alert">
          {{ errors.status }}
        </p>
      </div>

      <div class="form-group">
        <label for="location"> Konum </label>

        <input
          id="location"
          :aria-invalid="Boolean(errors.location)"
          :aria-describedby="errors.location ? 'location-error' : undefined"
          v-model="form.location"
          :maxlength="rules.locationMax"
          type="text"
          placeholder="Örn: Antalya"
        />
        <p v-if="errors.location" id="location-error" class="form-error" role="alert">
          {{ errors.location }}
        </p>
      </div>

      <div class="form-group">
        <label for="year"> Yıl </label>

        <input
          id="year"
          :aria-invalid="Boolean(errors.year)"
          :aria-describedby="errors.year ? 'year-error' : undefined"
          v-model.number="form.year"
          type="number"
          :min="rules.yearMin"
          :max="rules.yearMax"
          required
        />
        <p v-if="errors.year" id="year-error" class="form-error" role="alert">{{ errors.year }}</p>
      </div>

      <div class="form-group full-width">
        <label for="description"> Açıklama </label>

        <textarea
          id="description"
          :aria-invalid="Boolean(errors.description)"
          :aria-describedby="errors.description ? 'description-error' : undefined"
          v-model="form.description"
          :maxlength="rules.descriptionMax"
          rows="6"
          placeholder="Proje hakkında açıklama..."
        ></textarea>
        <p v-if="errors.description" id="description-error" class="form-error" role="alert">
          {{ errors.description }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-options {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.category-options legend {
  font-weight: 600;
  margin-bottom: 8px;
}
.category-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.project-form .category-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #dbe2e8;
  border-radius: 8px;
  cursor: pointer;
}
.project-form .category-option:has(input:checked) {
  background: #eef7f5;
  border-color: #167465;
}
.project-form .category-option input {
  width: 18px;
  height: 18px;
  padding: 0;
  min-height: 0;
  flex-shrink: 0;
  accent-color: #167465;
}
</style>

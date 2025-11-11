<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form @submit.prevent="save">
                <div class="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div class="sm:flex sm:items-start">
                    <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                      <PencilSquareIcon class="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    </div>
                    <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                        Edit {{ itemType }} Name
                      </DialogTitle>
                      <div class="mt-4">
                        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <input
                          type="text"
                          id="name"
                          v-model="editedName"
                          required
                          :placeholder="`Enter ${itemType.toLowerCase()} name`"
                          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:placeholder-gray-400"
                          ref="nameInput"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    :disabled="isSaving || !editedName.trim()"
                    class="inline-flex w-full justify-center rounded-md bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="!isSaving">Save</span>
                    <span v-else class="flex items-center">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  </button>
                  <button
                    type="button"
                    @click="close"
                    :disabled="isSaving"
                    class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { PencilSquareIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  currentName: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    required: true,
    validator: (value) => ['Dataset', 'Prompt', 'Evaluation'].includes(value)
  },
  onSave: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['close'])

const editedName = ref('')
const isSaving = ref(false)
const nameInput = ref(null)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    editedName.value = props.currentName
    nextTick(() => {
      nameInput.value?.focus()
      nameInput.value?.select()
    })
  }
})

const close = () => {
  if (!isSaving.value) {
    emit('close')
  }
}

const save = async () => {
  if (!editedName.value.trim() || editedName.value === props.currentName) {
    close()
    return
  }

  isSaving.value = true
  try {
    await props.onSave(editedName.value.trim())
    close()
  } catch (error) {
    console.error('Failed to save name:', error)
  } finally {
    isSaving.value = false
  }
}
</script>
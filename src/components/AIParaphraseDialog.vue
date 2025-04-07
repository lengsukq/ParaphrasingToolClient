<template>
  <Dialog :open="open" @update:open="onClose">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>AI 降重结果</DialogTitle>
        <DialogDescription>
          查看和编辑 AI 降重后的文本。
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-1 gap-4">
          <Label for="originalText">原文</Label>
          <Textarea
              id="originalText"
              v-model="props.originalText"
              readonly
              style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
          />
        </div>

        <div class="grid grid-cols-1 gap-4">
          <Label for="paraphrasedText">AI 降重结果</Label>
          <Textarea
              id="paraphrasedText"
              v-model="props.paraphrasedText"
              style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="onCopy">复制</Button>
        <Button @click="onClose">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, defineEmits, defineProps } from 'vue';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'vue-sonner'; // 导入 toast

const props = defineProps<{
  open: boolean;
  originalText: string;
  paraphrasedText: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'text-change', newText: string): void; // 可选，如果需要将修改后的文本传回父组件
}>();

const paraphrasedText = ref(props.paraphrasedText);

const onCopy = () => {
  navigator.clipboard.writeText(paraphrasedText.value)
      .then(() => {
      toast.success('文本已复制到剪贴板'); // 显示成功提示
      })
      .catch(err => {
      toast.error('复制失败'); // 显示失败提示
        console.error('Failed to copy text: ', err); // 复制失败后的提示
      });
};

const onClose = () => {
  emit('close');
};

</script>

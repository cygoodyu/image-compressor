/**
 * 图片压缩工具主要功能实现
 */
document.addEventListener('DOMContentLoaded', () => {
    // 更新 DOM 元素引用
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagesList = document.getElementById('imagesList');
    const qualityInput = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadAllBtn = document.getElementById('downloadAllBtn');

    let imageItems = []; // 存储所有图片项

    // 上传区域点击事件
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件拖拽处理
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#007AFF';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#c7c7c7';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#c7c7c7';
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    // 文件选择处理
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
        fileInput.value = ''; // 重置文件输入
    });

    // 质量滑块变化处理
    qualityInput.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
        const quality = e.target.value / 100;
        // 重新压缩所有图片
        imageItems.forEach(item => {
            compressImage(item.originalFile, quality, item.elements);
        });
    });

    // 下载所有压缩后的图片
    downloadAllBtn.addEventListener('click', () => {
        if (imageItems.length === 0) return;

        // 创建ZIP文件
        const zip = new JSZip();
        const promises = imageItems.map(item => 
            fetch(item.elements.compressedPreview.src)
                .then(response => response.blob())
                .then(blob => {
                    zip.file(`compressed_${item.originalFile.name}`, blob);
                })
        );

        Promise.all(promises).then(() => {
            zip.generateAsync({type: 'blob'}).then(content => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'compressed_images.zip';
                link.click();
            });
        });
    });

    /**
     * 处理多个文件上传
     * @param {File[]} files - 文件数组
     */
    function handleFiles(files) {
        if (files.length === 0) return;

        // 限制上传数量
        if (imageItems.length + files.length > 10) {
            alert('最多只能上传10张图片！');
            return;
        }

        // 过滤非图片文件
        const imageFiles = files.filter(file => file.type.match('image.*'));
        
        if (imageFiles.length === 0) {
            alert('请上传图片文件！');
            return;
        }

        previewContainer.hidden = false;

        // 处理每个图片文件
        imageFiles.forEach(file => {
            createImageItem(file);
        });
    }

    /**
     * 创建图片项
     * @param {File} file - 图片文件
     */
    function createImageItem(file) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'image-item';

        // 创建图片项的HTML结构
        itemDiv.innerHTML = `
            <button class="remove-image" title="移除图片">×</button>
            <div class="preview-section">
                <div class="preview-box">
                    <h3>原始图片</h3>
                    <div class="image-container">
                        <img class="original-preview" alt="原始图片预览">
                    </div>
                    <div class="file-info">
                        <span>原始大小：</span>
                        <span class="original-size">0 KB</span>
                    </div>
                </div>
                <div class="preview-box">
                    <h3>压缩后</h3>
                    <div class="image-container">
                        <img class="compressed-preview" alt="压缩后预览">
                    </div>
                    <div class="file-info">
                        <span>压缩后大小：</span>
                        <span class="compressed-size">0 KB</span>
                    </div>
                </div>
            </div>
        `;

        // 获取元素引用
        const elements = {
            originalPreview: itemDiv.querySelector('.original-preview'),
            compressedPreview: itemDiv.querySelector('.compressed-preview'),
            originalSize: itemDiv.querySelector('.original-size'),
            compressedSize: itemDiv.querySelector('.compressed-size'),
            removeButton: itemDiv.querySelector('.remove-image')
        };

        // 添加移除按钮事件
        elements.removeButton.addEventListener('click', () => {
            imageItems = imageItems.filter(item => item.itemDiv !== itemDiv);
            itemDiv.remove();
            if (imageItems.length === 0) {
                previewContainer.hidden = true;
            }
        });

        // 显示原始图片
        elements.originalSize.textContent = formatFileSize(file.size);
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.originalPreview.src = e.target.result;
            compressImage(file, qualityInput.value / 100, elements);
        };
        reader.readAsDataURL(file);

        // 保存图片项信息
        imageItems.push({
            originalFile: file,
            itemDiv,
            elements
        });

        // 添加到列表
        imagesList.appendChild(itemDiv);
    }

    /**
     * 压缩图片
     * @param {File} file - 原始图片文件
     * @param {number} quality - 压缩质量（0-1）
     * @param {Object} elements - 当前图片项的DOM元素引用
     */
    function compressImage(file, quality, elements) {
        // 添加加载状态
        elements.compressedPreview.style.opacity = '0.5';

        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 计算压缩后的尺寸
            let { width, height } = calculateDimensions(img.width, img.height);

            canvas.width = width;
            canvas.height = height;

            // 绘制图片时使用双线性插值算法
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height);

            // 根据文件类型选择合适的压缩参数
            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const compressionQuality = Math.min(quality, 0.9); // 限制最大质量

            canvas.toBlob((blob) => {
                // 如果压缩后的文件更大，则返回原文件
                if (blob.size >= file.size) {
                    elements.compressedPreview.src = URL.createObjectURL(file);
                    elements.compressedSize.textContent = formatFileSize(file.size);
                    elements.compressedPreview.style.opacity = '1';
                    return;
                }

                elements.compressedPreview.src = URL.createObjectURL(blob);
                elements.compressedSize.textContent = formatFileSize(blob.size);
                elements.compressedPreview.style.opacity = '1';
            }, mimeType, compressionQuality);

            URL.revokeObjectURL(img.src);
        };
    }

    /**
     * 计算压缩后的图片尺寸
     * @param {number} width - 原始宽度
     * @param {number} height - 原始高度
     * @returns {{width: number, height: number}} 压缩后的尺寸
     */
    function calculateDimensions(width, height) {
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        // 如果图片尺寸已经很小，则不需要缩放
        if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
            return { width, height };
        }

        // 计算缩放比例
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        
        return {
            width: Math.floor(width * ratio),
            height: Math.floor(height * ratio)
        };
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 文件大小（字节）
     * @returns {string} 格式化后的文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 